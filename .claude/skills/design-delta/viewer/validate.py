"""Check a DesignDelta carrier folder before it is published.

    python3 validate.py <carrier-folder> [--data delta.json]

Errors (exit 1) are things that break the page or the publish; warnings are
things a reviewer should look at. Run it after build.py, before every publish.
"""
import argparse
import json
import re
import struct
import sys
from pathlib import Path

SERVED = {".html", ".css", ".js", ".mjs", ".wasm", ".json", ".map", ".geojson", ".webmanifest", ".txt", ".md", ".csv",
          ".xml", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".woff", ".woff2", ".ttf", ".otf",
          ".mp3", ".wav", ".ogg", ".mp4", ".webm", ".pdf"}
TEXT = {".html", ".css", ".js", ".mjs", ".json", ".svg", ".txt", ".md", ".csv", ".xml", ".map"}
TOKENS = {"paper", "surface", "ink", "muted", "accent", "accent-ink", "media"}
OFF_ORIGIN = re.compile(r"""(?:\bsrc(?:set)?\s*=\s*["']|url\(\s*["']?)https?://(?!fonts\.(?:googleapis|gstatic)\.com)""", re.I)
LIMIT_FILE, LIMIT_TOTAL, LIMIT_COUNT = 15_000_000, 64_000_000, 255


def image_size(p: Path):
    """(w, h) for PNG, JPEG, WebP; None otherwise."""
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
        sizes = {}
        for side in ("before", "after"):
            s = c.get(side)
            if s is None:
                continue
            ref = s.get("src")
            if fid == "screenshot":
                if not isinstance(ref, dict):
                    err(f"{cid}.{side}: screenshot src must map width → image")
                    continue
                for w in widths:
                    f = ref.get(str(w))
                    if not f:
                        err(f"{cid}.{side}: no image for width {w}")
                        continue
                    referenced.add(f)
                    p = root / f
                    if p.is_file() and w == widths[0]:
                        sizes[side] = image_size(p)
            else:
                if not isinstance(ref, str) or not ref.endswith(".html"):
                    err(f"{cid}.{side}: {fid} src must be one .html file")
                    continue
                referenced.add(ref)
                p = root / ref
                if p.is_file() and not re.search(r"dd\s*:\s*['\"]size['\"]", p.read_text(errors="ignore")):
                    err(f"{cid}.{side}: {ref} does not speak the frame protocol (inline viewer/frame.js)")
        if c.get("compare") == "slider":
            if c.get("before") is None or c.get("after") is None:
                err(f"{cid}: slider needs both sides")
            elif sizes.get("before") and sizes.get("after"):
                (bw, bh), (aw, ah) = sizes["before"], sizes["after"]
                if abs(bw - aw) / max(bw, aw) > 0.1 or abs(bh - ah) / max(bh, ah) > 0.1:
                    err(f"{cid}: slider but stills differ by more than 10% ({bw}×{bh} vs {aw}×{ah}); use side")
        elif fid == "screenshot" and sizes.get("before") and sizes.get("after"):
            (bw, bh), (aw, ah) = sizes["before"], sizes["after"]
            if abs(bw - aw) / max(bw, aw) <= 0.1 and abs(bh - ah) / max(bh, ah) <= 0.1:
                warn(f"{cid}: stills are within 10%; compare should default to slider")

    for f in sorted(referenced):
        if not (root / f).is_file():
            err(f"referenced file missing: {f}")

    files = [p for p in root.rglob("*") if p.is_file() and not p.name.startswith(".")]
    total = 0
    for p in files:
        rel = str(p.relative_to(root))
        size = p.stat().st_size
        total += size
        if p.suffix.lower() not in SERVED:
            err(f"{rel}: `{p.suffix}` is not a type Artifacts serve")
        if size > LIMIT_FILE:
            err(f"{rel}: {size / 1e6:.1f} MB is over the 15 MB per-file limit")
        if p.suffix.lower() in TEXT:
            t = p.read_text(errors="replace")
            if "�" in t:
                err(f"{rel}: contains U+FFFD; write it as the \\uFFFD escape")
            if p.suffix.lower() in (".html", ".css") and OFF_ORIGIN.search(t):
                warn(f"{rel}: loads media from another host; Artifacts block it")
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
