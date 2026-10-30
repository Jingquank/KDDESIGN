#!/bin/sh
# Encode rendered frames (f00000.jpg …, from tools/frames.mjs render) into the film's MP4.
#   sh encode.sh <render-dir> <out.mp4>
# 60 fps, H.264, CRF 16, yuv420p (limited range, as players expect), faststart. Odd sizes are
# padded to even, as yuv420p needs. A partial render may start at any frame number.
set -e
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is not installed (brew install ffmpeg)"; exit 3; }
first=$(ls "$1" 2>/dev/null | grep -E '^f[0-9]{5}\.jpg$' | sort | head -1)
[ -n "$first" ] || { echo "no frames in $1 (expected f00000.jpg …)"; exit 2; }
start=$(echo "$first" | sed -E 's/^f0*([0-9]+)\.jpg$/\1/')
ffmpeg -y -loglevel error -framerate 60 -start_number "${start:-0}" -i "$1/f%05d.jpg" \
  -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2,scale=in_range=pc:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -color_range tv -movflags +faststart "$2"
echo "$2 $(du -h "$2" | cut -f1)"
