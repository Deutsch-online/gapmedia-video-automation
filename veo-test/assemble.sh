#!/bin/bash
# Joins the two Veo clips into one portrait film. Clip 2 is 16:9: a 9:16 window of it is cut out and
# follows who is on screen (x as a fraction of the width, by time), scaled to 1080x1920.
set -e
cd "$(dirname "$0")"
W=607   # 1080 / 1920 * 1080 px wide window of the 1920x1080 frame
X="if(lt(t,3.6),0.50,if(lt(t,6.2),0.40,if(lt(t,7.4),0.34,if(lt(t,8.7),0.52,0.42))))"
ffmpeg -y -loglevel error -i part2-landscape.mp4 -vf "crop=${W}:1080:'max(0,min(1920-${W},(iw*(${X}))-${W}/2))':0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30" \
  -af "aresample=44100" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k part2-portrait.mp4
# clip 3 (16:9 too): the final callback at the counter and the exit
W3=607
X3="if(lt(t,2.0),0.44,if(lt(t,5.6),0.52,0.47))"
ffmpeg -y -loglevel error -i part3-landscape.mp4 -vf "crop=${W3}:1080:'max(0,min(1920-${W3},(iw*(${X3}))-${W3}/2))':0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6,setsar=1,fps=30" \
  -af "aresample=44100" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k part3-portrait.mp4
ffmpeg -y -loglevel error -i part1.mp4 -vf "setsar=1,fps=30" -af "aresample=44100" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k part1-n.mp4
printf "file 'part1-n.mp4'\nfile 'part2-portrait.mp4'\nfile 'part3-portrait.mp4'\n" > list.txt
# repairs (found by looking at the film): 1. black flicker frames at 35.6-37.0 s (a join in the Veo output; the speech goes on
# there, so the frames are dropped and the previous picture is held, no cut); 2. a speech bubble that Veo painted into the
# picture at about 21.6-24.1 s ("Herr Pfeiffer,"): the area is blurred (the caption card sits over it)
BLACK="between(t,35.6333,35.7)+between(t,35.7667,35.8333)+between(t,35.9333,36)+between(t,36.1333,36.5333)+between(t,36.6,36.6667)+between(t,36.7333,36.8333)+between(t,36.9,37.0333)"
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt \
  -filter_complex "[0:v]select='not(${BLACK})',fps=30,split[a][b];[b]crop=700:320:190:1270,boxblur=40:3[bl];[a][bl]overlay=190:1270:enable='between(t,21.6,24.1)'[v];[0:a]loudnorm=I=-16:TP=-1.5:LRA=9[aud]" \
  -map "[v]" -map "[aud]" -t 65.0 -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -movflags +faststart film.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 film.mp4
