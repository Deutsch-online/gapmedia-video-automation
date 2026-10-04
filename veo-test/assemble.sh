#!/bin/bash
# Joins the two Veo clips into one portrait film. Clip 2 is 16:9: a 9:16 window of it is cut out and
# follows who is on screen (x as a fraction of the width, by time), scaled to 1080x1920.
set -e
cd "$(dirname "$0")"
W=607   # 1080 / 1920 * 1080 px wide window of the 1920x1080 frame
X="if(lt(t,3.6),0.50,if(lt(t,6.2),0.40,if(lt(t,7.4),0.34,if(lt(t,8.7),0.52,0.42))))"
ffmpeg -y -loglevel error -i part2-landscape.mp4 -vf "crop=${W}:1080:'max(0,min(1920-${W},(iw*(${X}))-${W}/2))':0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30" \
  -af "aresample=44100" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k part2-portrait.mp4
ffmpeg -y -loglevel error -i part1.mp4 -vf "setsar=1,fps=30" -af "aresample=44100" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k part1-n.mp4
printf "file 'part1-n.mp4'\nfile 'part2-portrait.mp4'\n" > list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -movflags +faststart film.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 film.mp4
