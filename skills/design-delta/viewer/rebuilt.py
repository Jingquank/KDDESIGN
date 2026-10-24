"""Turn snapshot.js captures into Rebuilt frames.

    python3 rebuilt.py css <carrier> --out rebuilt/after.css --root <dir> --host <url> <cap.json> [<cap.json> ...]
    python3 rebuilt.py frame <carrier> --cap <cap.json> --css rebuilt/after.css --out c5/after.html
                       --root <dir> --host <url> [--groups '<json>'] [--init '<json>'] [--script <file.js>]

<root> is the folder the captured page was served from at <host>, so captured
URLs map back to local files.

`css` merges the rules every capture of one state used into one stylesheet, in
the page's own order, fonts inlined. Every frame of that state links it, so the
site's CSS ships once per state instead of once per frame.

`frame` writes one frame: viewer/frame.js inlined, the stylesheet linked, the
piece's wrappers rebuilt, each image inlined once (still images re-encoded like the stills), and the markup of every
captured state. With --groups (the cfg.groups given to snapshot.js), a click on
a button or a change of a <select> whose text names a value shows that state;
--init names the state shown first when the page loaded in none of them.
--script adds the piece's own motion (parallax, playback turns), re-implemented
from its source. Kept videos (snapshot video: 'keep') are cut to at most 6 s,
480px wide, no audio, into clips/ next to the frame. Links do not navigate.
"""
import argparse
import base64
import io
import json
import mimetypes
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")

PLAYER = """(function () {
  var M = __M__, H = __H__, S = __S__, G = __G__, cur = __INIT__;
  var root = document.getElementById('dd-root');
  var fill = function (h) { return h.replace(/@@(\\d+)@@/g, function (m, n) { return M[n] }) };
  var norm = function (s) { return s.replace(/\\s+/g, ' ').trim() };
  root.innerHTML = fill(H[S[cur.join('|')]]);
  function pick(t) {
    for (var i = 0; i < G.length; i++) for (var j = 0; j < G[i].values.length; j++) {
      var last = G[i].values[j].split('>').pop();
      if (G[i].match === 'start' ? t.indexOf(last) === 0 : t === last) { cur[i] = G[i].values[j]; var k = cur.join('|'); if (k in S) root.innerHTML = fill(H[S[k]]); return }
    }
  }
  root.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) pick(norm(b.textContent)) });
  root.addEventListener('change', function (e) { var s = e.target; if (s.tagName === 'SELECT') pick(norm(s.options[s.selectedIndex].text)) });
})();"""


def local(url, a):
    if not url.startswith(a.host):
        return None
    return Path(a.root) / url[len(a.host):].split("?")[0].split("#")[0]


def data_uri(p: Path) -> str:
    return f"data:{mimetypes.guess_type(p.name)[0] or 'application/octet-stream'};base64," + base64.b64encode(p.read_bytes()).decode()


def image_uri(p: Path) -> str:
    """A still image as AVIF at most still.MAX_W wide, like the stills; animated or smaller-as-is images stay as they are."""
    try:
        from PIL import Image, features
        from still import AVIF_Q, MAX_W
        with Image.open(p) as im:
            if getattr(im, "is_animated", False) or not features.check("avif"):
                return data_uri(p)
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
            if im.width > MAX_W:
                im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, "AVIF", quality=AVIF_Q, speed=4)
        if buf.tell() >= p.stat().st_size:
            return data_uri(p)
        return "data:image/avif;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:  # noqa: BLE001
        return data_uri(p)


URL = re.compile(r"url\(\"([^\"]+)\"\)")


def cmd_css(a):
    items = {}
    for cap in a.caps:
        for r in json.loads(Path(cap).read_text())["rules"]:
            items.setdefault(".".join(map(str, r["k"])), r)
    out, open_wrap = [], []
    for r in sorted(items.values(), key=lambda r: r["k"]):
        wrap = r["wrap"]
        while open_wrap and open_wrap != wrap[:len(open_wrap)]:
            out.append("}")
            open_wrap.pop()
        for w in wrap[len(open_wrap):]:
            out.append(w + "{")
            open_wrap.append(w)
        text = r["text"]
        def inline(m):
            p = local(m.group(1), a)
            if p is None:
                return m.group(0)
            if not p.is_file():
                print(f"WARN missing {p}; dropped", file=sys.stderr)
                return "url(\"\")"
            return f"url(\"{data_uri(p)}\")"
        if text.startswith("@font-face"):
            p = next((local(u, a) for u in URL.findall(text)), None)
            if p is not None and not p.is_file():
                continue
        out.append(URL.sub(inline, text))
    out.extend("}" * len(open_wrap))
    dest = Path(a.carrier) / a.out
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text("\n".join(out))
    print(f"{dest} {dest.stat().st_size // 1024} KB, {len(items)} rules")


def cmd_frame(a):
    cap = json.loads(Path(a.cap).read_text())
    carrier, out = Path(a.carrier), Path(a.carrier) / a.out
    out.parent.mkdir(parents=True, exist_ok=True)
    groups = json.loads(a.groups) if a.groups else []
    init = json.loads(a.init) if a.init else (cap["initKey"].split("|") if cap.get("initKey") else [""])
    uniq, index = [], {}
    for k, h in cap["states"].items():
        if h not in uniq:
            uniq.append(h)
        index[k] = uniq.index(h)
    media = []

    def token(m):
        url = m.group(0)
        p = local(url, a)
        if p is None:
            return url
        if p.suffix == ".mp4":
            clip = out.parent / "clips" / p.name
            if not clip.exists():
                clip.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p), "-t", "6", "-an", "-vf", "scale='min(480,iw)':-2",
                                "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(clip)], check=True)
            return f"clips/{p.name}"
        if not p.is_file():
            print(f"WARN missing {p}; that image is left empty", file=sys.stderr)
            return ""
        if url not in media:
            media.append(url)
        return f"@@{media.index(url)}@@"
    H = [re.sub(re.escape(a.host) + r"[^\"')\s]+", token, h) for h in uniq]
    M = [image_uri(local(u, a)) for u in media]
    player = (PLAYER.replace("__M__", json.dumps(M)).replace("__H__", json.dumps(H)).replace("__S__", json.dumps(index))
              .replace("__G__", json.dumps(groups)).replace("__INIT__", json.dumps(init)))
    extra = Path(a.script).read_text() if a.script else ""
    chain = cap["chain"]
    body, wrappers = chain[0], chain[1:]
    opens = closes = ""
    for i, w in enumerate(wrappers):
        # Page shells often fill the viewport (min-height: 100dvh); a frame must end where the piece ends.
        attrs = (f' id="{w["id"]}"' if w["id"] else (' id="dd-root"' if i == len(wrappers) - 1 else "")) + (f' class="{w["cls"]}"' if w["cls"] else "") + ' style="min-height:0"'
        opens += f"<{w['tag']}{attrs}>"
        closes = f"</{w['tag']}>" + closes
    if not wrappers or wrappers[-1]["id"]:
        opens, closes = opens + '<div id="dd-root" style="display:contents">', "</div>" + closes
    frame_js = "\n".join(l for l in (HERE / "frame.js").read_text().splitlines() if not l.lstrip().startswith("//"))
    css = os.path.relpath(carrier / a.css, out.parent)
    script = (player + "\n" + extra).replace("</", "<\\/")
    out.write_text(f"""<!doctype html>
<html lang="en"><head>
<script>{frame_js}</script>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{out.stem}</title>
<link rel="stylesheet" href="{css}">
<style>html,body{{margin:0;min-height:0}}</style>
</head><body{(' class="' + body['cls'] + '"') if body['cls'] else ''}>{opens}{closes}
<script>
document.addEventListener('click', function (e) {{ var a = e.target.closest('a'); if (a) e.preventDefault() }});
{script}
</script>
</body></html>
""")
    print(f"{out} {out.stat().st_size // 1024} KB, {len(uniq)} states, {len(media)} images")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("css", "frame"):
        p = sub.add_parser(name)
        p.add_argument("carrier")
        p.add_argument("--root", required=True)
        p.add_argument("--host", required=True)
        p.add_argument("--out", required=True)
    sub.choices["css"].add_argument("caps", nargs="+")
    f = sub.choices["frame"]
    f.add_argument("--cap", required=True)
    f.add_argument("--css", required=True)
    f.add_argument("--groups")
    f.add_argument("--init")
    f.add_argument("--script")
    a = ap.parse_args()
    {"css": cmd_css, "frame": cmd_frame}[a.cmd](a)


if __name__ == "__main__":
    main()
