"""Check a Design Lessons Review's review.json and render its page.

    python3 build.py <folder>

<folder> holds review.json (FORMAT.md). Writes <folder>/index.html from
template.html with the data inlined. Prints every ERROR and exits 1 if there is
one; a page is never written from data that fails a check.

Then prints the `files` map for the Artifact publish: example stills copied
server side from their Design Changelogs ({"artifact", "path"}), or local files
under <folder>. One publish may copy from at most 4 artifacts, so the map comes
in batches: publish the page with the first, then each further batch to the
same url.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ID = re.compile(r"^rule/[a-z0-9]+(-[a-z0-9]+)*$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RULE_KEYS = ("rule", "scope", "why", "exceptions", "bad", "good")
GROUPS = ("review", "rereview", "back", "thin")
KINDS = ("commit", "conversation", "note")
ARTIFACT = re.compile(r"^https://claude\.ai/(code/)?artifact/[\w-]+$")
IMAGE = re.compile(r"^ex/[a-z0-9-]+/[\w.-]+\.(avif|webp|png|jpg)$")
SOURCES_PER_PUBLISH = 4


def check(d, folder):
    errors = []
    err = errors.append
    for k in ("date", "project", "rulesFile", "read", "items"):
        if k not in d:
            err(f"missing top-level `{k}`")
    if errors:
        return errors
    if not DATE.match(d["date"]):
        err(f"date `{d['date']}` is not YYYY-MM-DD")
    if d.get("lastRun") and not DATE.match(d["lastRun"]):
        err(f"lastRun `{d['lastRun']}` is not YYYY-MM-DD")
    seen = set()
    for i, it in enumerate(d["items"]):
        at = it.get("id", f"items[{i}]")
        if not ID.match(it.get("id", "")):
            err(f"{at}: id must be rule/<kebab-slug>")
        if at in seen:
            err(f"{at}: listed twice; one candidate lands in one group")
        seen.add(at)
        g = it.get("group")
        if g not in GROUPS:
            err(f"{at}: group must be one of {', '.join(GROUPS)}")
            continue
        if not it.get("title"):
            err(f"{at}: missing title")
        for s in it.get("sources", []):
            if s.get("kind") not in KINDS:
                err(f"{at}: source kind must be one of {', '.join(KINDS)}")
            if not s.get("where"):
                err(f"{at}: every source names where it was cited (a Delta and Change)")
        if "wordings" in it:
            if g not in ("review", "back"):
                err(f"{at}: wordings only on review and back items")
            for w in it["wordings"]:
                if not str(w.get("text", "")).strip() or not w.get("where"):
                    err(f"{at}: every wording has text and where it was proposed (a Delta and Change)")
        if g in ("review", "back") or (g == "rereview" and "draft" in it):
            dr = it.get("draft") or {}
            for k in RULE_KEYS:
                if not str(dr.get(k, "")).strip():
                    err(f"{at}: draft.{k} is empty; write — when no source states it")
        if g == "review":
            src = it.get("sources", [])
            if len(src) < 2 and not any(s.get("kind") == "note" for s in src):
                err(f"{at}: in review with {len(src)} source(s) and no Note; it belongs in thin")
        if g == "back":
            rj = it.get("rejected") or {}
            if not DATE.match(str(rj.get("date", ""))):
                err(f"{at}: back needs rejected.date")
        if g == "rereview":
            cur = it.get("current") or {}
            for k in RULE_KEYS + ("accepted",):
                if not str(cur.get(k, "")).strip():
                    err(f"{at}: current.{k} is empty")
            if len(it.get("breaks", [])) < 2:
                err(f"{at}: re-review needs 2 or more breaks")
        if g == "thin" and not it.get("missing"):
            err(f"{at}: thin needs `missing` (\"needs 1 more source\")")
        # The EN | 中 toggle: the Chinese of everything a reader decides on is required; source and break texts fall back to English.
        zh = it.get("zh") or {}
        if not str(zh.get("title", "")).strip():
            err(f"{at}: missing zh.title")
        for key in (("draft",) if g in ("review", "back") else ()) + (("current",) + (("draft",) if "draft" in it else ()) if g == "rereview" else ()):
            for k in RULE_KEYS:
                if not str((zh.get(key) or {}).get(k, "")).strip():
                    err(f"{at}: missing zh.{key}.{k}")
        if g == "thin" and not str(zh.get("missing", "")).strip():
            err(f"{at}: missing zh.missing")
        for k, side in (it.get("example") or {}).items():
            if k not in ("bad", "good"):
                err(f"{at}: example.{k}: only bad and good")
                continue
            src, frm = side.get("src", ""), side.get("from")
            if not IMAGE.match(src):
                err(f"{at}: example.{k}.src `{src}` must be ex/<rule-slug>/<file>.avif|webp|png|jpg")
            elif frm is None and not (folder / src).is_file():
                err(f"{at}: example.{k}: no `from` and no local file {src}")
            if frm is not None and not (isinstance(frm, dict) and ARTIFACT.match(str(frm.get("artifact", ""))) and frm.get("path")):
                err(f"{at}: example.{k}.from must be {{artifact: <claude.ai artifact url>, path: <published path>}}")
    return errors


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    folder = Path(sys.argv[1])
    data = json.loads((folder / "review.json").read_text())
    errors = check(data, folder)
    for e in errors:
        print("ERROR", e)
    if errors:
        sys.exit(1)
    page = (HERE / "template.html").read_text()
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = page.replace("/*__DATA__*/null", blob, 1).replace("__TITLE__", f"{data['project']} Design Lessons Review", 1)
    (folder / "index.html").write_text(page)
    groups = {g: sum(1 for it in data["items"] if it["group"] == g) for g in GROUPS}
    print(f"{folder / 'index.html'} · " + ", ".join(f"{n} {g}" for g, n in groups.items()))
    local, remote = {}, {}
    for it in data["items"]:
        for side in (it.get("example") or {}).values():
            if side.get("from"):
                remote.setdefault(side["from"]["artifact"], {})[side["src"]] = {"artifact": side["from"]["artifact"], "path": side["from"]["path"]}
            else:
                local[side["src"]] = side["src"]
    arts = list(remote)
    batches = [arts[i:i + SOURCES_PER_PUBLISH] for i in range(0, len(arts), SOURCES_PER_PUBLISH)] or [[]]
    for n, batch in enumerate(batches, 1):
        files = dict(local) if n == 1 else {}
        for a in batch:
            files.update(remote[a])
        what = "publish the page with root <folder> and" if n == 1 else "then publish to the same url with"
        print(f"files {n}/{len(batches)} ({what} these files):")
        print(json.dumps(files, indent=1))


if __name__ == "__main__":
    main()
