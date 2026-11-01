#!/bin/sh
# Encode rendered frames (f00000.jpg …, from tools/frames.mjs render) into the film's MP4.
#   sh encode.sh <render-dir> <out.mp4> [audio.wav]
# 60 fps, H.264, CRF 16, yuv420p (limited range, as players expect), faststart. Odd sizes are
# padded to even, as yuv420p needs. A partial render may start at any frame number.
# With audio.wav (tools/frames.mjs audio), the sound goes in as AAC 192k, its peak raised to -1 dB
# with a limiter (the live player plays softer; the balance between cues is unchanged), cut to the
# video's length.
set -e
command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is not installed (brew install ffmpeg)"; exit 3; }
first=$(ls "$1" 2>/dev/null | grep -E '^f[0-9]{5}\.jpg$' | sort | head -1)
[ -n "$first" ] || { echo "no frames in $1 (expected f00000.jpg …)"; exit 2; }
start=$(echo "$first" | sed -E 's/^f0*([0-9]+)\.jpg$/\1/')
if [ -n "$3" ]; then
  [ -f "$3" ] || { echo "no audio file $3"; exit 2; }
  peak=$(ffmpeg -hide_banner -i "$3" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-*[0-9.]*\) dB.*/\1/p')
  gain=$(awk -v p="${peak:-0}" 'BEGIN { g = -1 - p; if (g < 0) g = 0; printf "%.2f", g }')
  ffmpeg -y -loglevel error -framerate 60 -start_number "${start:-0}" -i "$1/f%05d.jpg" -i "$3" \
    -map 0:v -map 1:a -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2,scale=in_range=pc:out_range=tv,format=yuv420p" \
    -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -color_range tv \
    -af "volume=${gain}dB,alimiter=limit=0.95" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$2"
else
  ffmpeg -y -loglevel error -framerate 60 -start_number "${start:-0}" -i "$1/f%05d.jpg" \
    -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2,scale=in_range=pc:out_range=tv,format=yuv420p" \
    -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -color_range tv -movflags +faststart "$2"
fi
echo "$2 $(du -h "$2" | cut -f1)"
