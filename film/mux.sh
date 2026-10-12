#!/bin/sh
# Build the soundtrack (score + sfx, voiceover with the music ducked under it), render both formats, mux.
set -e
cd "$(dirname "$0")"
python3 music.py
python3 vo.py "$@"
ffmpeg -y -v error -i mix_raw.wav -i vo.wav -filter_complex "[1:a]aformat=channel_layouts=stereo,asplit=2[vo][sc];[0:a][sc]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=450[duck];[duck][vo]amix=inputs=2:weights='1 1.25':normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 mix.wav
node render.js 1920 1080 v_1920.mp4 > l.log 2>&1 &
node render.js 1080 1350 v_1080.mp4 > p.log 2>&1 &
wait
for s in 1920x1080 1080x1350; do
  w=${s%x*}
  ffmpeg -y -v error -i v_$w.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart GAIN2026_film_$s.mp4
done
