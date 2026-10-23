"""Render a DesignDelta page from its delta.json.

    python3 build.py <carrier-folder> [--data delta.json] [--out index.html]

<carrier-folder> holds delta.json and the Change files (c1/…). This writes the
page (the template with the data inlined), copies viewer.css and viewer.js next
to it, and prints the `files` list to publish. Nothing else is generated:
everything a run varies lives in delta.json. --data and --out render a variant
of the same folder (the evals use them for Final and other-language pages).
"""
import argparse
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--data", default="delta.json")
    ap.add_argument("--out", default="index.html")
    a = ap.parse_args()
    folder = Path(a.folder).resolve()

    data = json.loads((folder / a.data).read_text())
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    title = data["title"].replace("&", "&amp;").replace("<", "&lt;")
    page = (HERE / "index.html").read_text().replace("__TITLE__", title).replace("__DATA__", blob)
    (folder / a.out).write_text(page)
    for name in ("viewer.css", "viewer.js"):
        shutil.copy2(HERE / name, folder / name)

    skip = {a.out, "delta.md"}
    files = sorted(
        str(p.relative_to(folder)) for p in folder.rglob("*")
        if p.is_file() and p.name not in skip and not p.name.startswith(".")
        and not (p.parent == folder and p.name.startswith(("index", "delta")) and p.suffix in (".html", ".json"))
    )
    print(json.dumps([{"path": f} for f in files]))


if __name__ == "__main__":
    main()
