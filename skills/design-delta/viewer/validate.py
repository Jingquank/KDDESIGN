"""Check a Design Changelog carrier folder before it is published.

    python3 validate.py <carrier-folder> [--data delta.json] [--budget-mb 8]

Errors (exit 1) are things that break the page or the publish, or a publish
over budget; warnings are things a reviewer should look at. Run it after
build.py, before every publish. The budget counts what this round publishes
(build.published), the page included.
"""
import argparse
import json
import re
import struct
import sys
from pathlib import Path

from build import published

SERVED = {".html", ".css", ".js", ".mjs", ".wasm", ".json", ".map", ".geojson", ".webmanifest", ".txt", ".md", ".csv",
          ".xml", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2", ".ttf", ".otf",
          ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".pdf"}
TEXT = {".html", ".css", ".js", ".mjs", ".json", ".svg", ".txt", ".md", ".csv", ".xml", ".map"}
TOKENS = {"paper", "surface", "ink", "muted", "accent", "accent-ink", "media"}
OFF_ORIGIN = re.compile(r"""(?:\bsrc(?:set)?\s*=\s*["']|url\(\s*["']?)https?://(?!fonts\.(?:googleapis|gstatic)\.com)""", re.I)
LIMIT_FILE, LIMIT_TOTAL, LIMIT_COUNT = 15_000_000, 64_000_000, 255
BUDGET_MB = 8
STILL_MAX_W = 960


def image_size(p: Path):
    """(w, h) for PNG, JPEG, WebP, and AVIF when Pillow can read it; None otherwise."""
    if p.suffix.lower() == ".avif":
        try:
            from PIL import Image
            with Image.open(p) as im:
                return im.size
        except Exception:  # noqa: BLE001
            return None
    b = p.read_bytes()[:64 * 1024]
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", b[16:24])
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        kind = b[12:16]
        if kind == b"VP8 ":
            return struct.unpack("<H", b[26:28])[0] & 0x3FFF, struct.unpack("<H", b[28:30])[0] & 0x3FFF
        if kind == b"VP8L":
            v = struct.unpack("<I", b[21:25])[0]
            return (v & 0x3FFF) + 1, ((v >> 14) & 0x3FFF) + 1
        if kind == b"VP8X":
            return int.from_bytes(b[24:27], "little") + 1, int.from_bytes(b[27:30], "little") + 1
    if b[:2] == b"\xff\xd8":
        i = 2
        while i < len(b) - 9:
            if b[i] != 0xFF:
                i += 1
                continue
            marker, length = b[i + 1], struct.unpack(">H", b[i + 2:i + 4])[0]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack(">HH", b[i + 5:i + 9])
                return w, h
            i += 2 + length
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--data", default="delta.json")
    ap.add_argument("--budget-mb", type=float, default=BUDGET_MB)
    a = ap.parse_args()
    root = Path(a.folder).resolve()
    errors, warnings = [], []
    err, warn = errors.append, warnings.append

    try:
        d = json.loads((root / a.data).read_text())
    except Exception as e:  # noqa: BLE001
        print(f"ERROR {a.data}: {e}")
        return 1

    for k in ("title", "round", "folder", "scope", "changes"):
        if k not in d:
            err(f"missing top-level `{k}`")
    if d.get("round") not in ("1", "final"):
        err("`round` must be \"1\" or \"final\"")
    if not 2 <= len(d.get("title", "").split()) <= 4 and not re.search(r"[㐀-鿿]", d.get("title", "")):
        warn(f"title `{d.get('title')}` is not two to four words")
    theme = d.get("theme") or {}
    for mode in ("light", "dark"):
        extra = set((theme.get(mode) or {})) - TOKENS
        if extra:
            err(f"theme.{mode} has unknown tokens {sorted(extra)}; use {sorted(TOKENS)}")
    src = (theme.get("font") or {}).get("src", "")
    if src and not src.startswith("data:"):
        warn("theme.font.src is not a data: URI; a linked font file may be blocked")

    ids = [c.get("id") for c in d.get("changes", [])]
    if len(ids) != len(set(ids)):
        err("duplicate Change ids")
    referenced = set()
    for c in d.get("changes", []):
        cid = c.get("id", "?")
        for k in ("id", "title", "desc", "kind", "fidelity", "widths"):
            if not c.get(k):
                err(f"{cid}: missing `{k}`")
        if not re.fullmatch(r"c\d+", str(cid)):
            err(f"{cid}: id must look like c1, c2, …")
        if c.get("kind") not in ("new", "fix"):
            err(f"{cid}: kind must be new or fix")
        fid = c.get("fidelity")
        if fid not in ("screenshot", "rebuilt", "real"):
            err(f"{cid}: fidelity must be screenshot, rebuilt or real")
        if fid in ("rebuilt", "real") and not c.get("fidelityNote"):
            err(f"{cid}: {fid} needs a `fidelityNote` saying why a still is not enough")
        if c.get("before") is None and c.get("after") is None:
            err(f"{cid}: Before and After are both null")
        if c.get("before") is None and c.get("kind") == "fix":
            warn(f"{cid}: no Before but kind is fix (a surface that did not exist is New)")
        if d.get("round") != "final" and c.get("caption"):
            warn(f"{cid}: caption is set in Round 1; captions come from Notes at Final")
        widths = c.get("widths") or []
        frames = 0
        for side in ("before", "after"):
            s = c.get(side)
            if s is None:
                continue
            ref = s.get("src")
            if not isinstance(ref, dict):
                err(f"{cid}.{side}: src must map width → still (every Fidelity has stills; Final shows only them)")
                continue
            for w in widths:
                f = ref.get(str(w))
                if not f:
                    err(f"{cid}.{side}: no still for width {w}")
                    continue
                referenced.add(f)
                p = root / f
                if p.is_file():
                    size = image_size(p)
                    if size and size[0] > STILL_MAX_W:
                        err(f"{cid}.{side}: {f} is {size[0]}px wide; encode stills with viewer/still.py (max {STILL_MAX_W}px)")
                    if p.suffix.lower() != ".avif":
                        warn(f"{cid}.{side}: {f} is not AVIF; viewer/still.py writes AVIF when Pillow can")
            fr = s.get("frame")
            if fr is None:
                continue
            frames += 1
            if fid == "screenshot":
                err(f"{cid}.{side}: a frame on a screenshot Change; set fidelity or drop the frame")
            if not isinstance(fr, str) or not fr.endswith(".html"):
                err(f"{cid}.{side}: frame must be one .html file")
                continue
            referenced.add(fr)
            p = root / fr
            if p.is_file() and not re.search(r"dd\s*:\s*['\"]size['\"]", p.read_text(errors="ignore")):
                err(f"{cid}.{side}: {fr} does not speak the frame protocol (inline viewer/frame.js)")
        if fid in ("rebuilt", "real") and not frames:
            err(f"{cid}: {fid} but neither side has a frame")

    for f in sorted(referenced):
        if not (root / f).is_file():
            err(f"referenced file missing: {f}")

    keep, _ = published(root, d)
    files = [root / "index.html"] + [root / f for f in keep]
    total, heavy = 0, {}
    for p in files:
        if not p.is_file():
            continue
        rel = str(p.relative_to(root))
        size = p.stat().st_size
        total += size
        heavy[rel.split("/")[0]] = heavy.get(rel.split("/")[0], 0) + size
        if p.suffix.lower() not in SERVED:
            err(f"{rel}: `{p.suffix}` is not a type Artifacts serve")
        if size > LIMIT_FILE:
            err(f"{rel}: {size / 1e6:.1f} MB is over the 15 MB per-file limit")
        if p.suffix.lower() in TEXT:
            t = p.read_text(errors="replace")
            if "\ufffd" in t:
                err(f"{rel}: contains U+FFFD; write it as the \\uFFFD escape")
            if p.suffix.lower() in (".html", ".css") and OFF_ORIGIN.search(t):
                warn(f"{rel}: loads media from another host; Artifacts block it")
    if total > a.budget_mb * 1e6:
        top = ", ".join(f"{k} {v / 1e6:.1f} MB" for k, v in sorted(heavy.items(), key=lambda kv: -kv[1])[:4])
        err(f"over budget: {total / 1e6:.1f} MB, budget {a.budget_mb:g} MB. "
            f"Heaviest: {top}. Move a Real Change to Rebuilt, drop video from a frame, or carry it as Screenshot (FIDELITY.md)")
    if len(files) > LIMIT_COUNT:
        warn(f"{len(files)} files: publish in batches of {LIMIT_COUNT} to the same url")
    if total > LIMIT_TOTAL:
        warn(f"{total / 1e6:.1f} MB: over 64 MB per publish; publish in batches")

    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    n = len(d.get("changes", []))
    print(f"{n} Changes · {len(files)} files · {total / 1e6:.1f} MB · {len(errors)} errors · {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
