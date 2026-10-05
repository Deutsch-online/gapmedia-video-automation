#!/usr/bin/env bash
# Measured quality check of one video (owner, 2026-10-05: "assess the videos, use the installed skills and plugins, work precisely").
# Uses the business-motion-film scripts (frozen-time, loudness, contact-sheet) plus ffmpeg detectors.
# Usage: scripts/qc-video.sh <video> <outdir> [label]
# Writes <outdir>/qc.json (numbers), <outdir>/contact.jpg (a frame every 2.5 s). Measured only: listening and judging stay with people.
set -uo pipefail
f="$1"; out="$2"; label="${3:-$(basename "$f")}"
S="$(cd "$(dirname "$0")" && pwd)/qc"
mkdir -p "$out"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")
h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f")
fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f")
hasaudio=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$f" | head -1)
# loudness (EBU R128)
ld=$(bash "$S/loudness.sh" "$f" 2>/dev/null | tr '\n' ' ')
lufs=$(echo "$ld" | grep -oE "I: *-?[0-9.]+" | head -1 | grep -oE "\-?[0-9.]+$")
lra=$(echo "$ld" | grep -oE "LRA: *[0-9.]+" | head -1 | grep -oE "[0-9.]+$")
peak=$(echo "$ld" | grep -oE "Peak: *-?[0-9.]+" | head -1 | grep -oE "\-?[0-9.]+$")
# silence: segments over 0.4 s under -35 dB, and the share of the film they cover
sil=$(ffmpeg -hide_banner -i "$f" -af silencedetect=noise=-35dB:d=0.4 -f null - 2>&1)
silences=$(echo "$sil" | grep -c silence_start)
silsec=$(echo "$sil" | grep -oE "silence_duration: [0-9.]+" | awk '{s+=$2} END{printf "%.1f", s+0}')
# picture: cuts (scene score > 0.3), frozen samples (frame difference < 0.35 at 10 fps), black frames
cuts=$(ffmpeg -hide_banner -i "$f" -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -an -f null - 2>&1 | grep -c pts_time)
frozen=$(bash "$S/frozen-time.sh" "$f" 0.35 2>/dev/null | grep -oE "near-frozen samples: [0-9]+ \(≈[0-9.]+s\)" | head -1)
frozens=$(echo "$frozen" | grep -oE "≈[0-9.]+" | tr -d '≈')
black=$(ffmpeg -hide_banner -i "$f" -vf blackdetect=d=0.1:pix_th=0.1 -an -f null - 2>&1 | grep -c black_start)
bash "$S/contact-sheet.sh" "$f" "$out/contact.jpg" 2.5 8 4 >/dev/null 2>&1
python3 - "$out/qc.json" <<PY
import json,sys
d=float("${dur:-0}")
def f(x,default=None):
    try: return float(x)
    except: return default
o={"label":"$label","duration_s":round(d,2),"width":int("${w:-0}"),"height":int("${h:-0}"),"fps":"$fps","has_audio":bool("$hasaudio"),
"aspect":round(int("${w:-1}")/max(1,int("${h:-1}")),3),
"loudness_lufs":f("${lufs:-}"),"loudness_range_lu":f("${lra:-}"),"true_peak_dbtp":f("${peak:-}"),
"silences_over_0.4s":int("${silences:-0}"),"silence_seconds":f("${silsec:-0}",0),"silence_share":round(f("${silsec:-0}",0)/d,3) if d else None,
"hard_cuts_score_0.3":int("${cuts:-0}"),"cuts_per_minute":round(int("${cuts:-0}")/d*60,1) if d else None,
"frozen_seconds_est":f("${frozens:-0}",0),"frozen_share":round(f("${frozens:-0}",0)/d,3) if d else None,"black_segments":int("${black:-0}")}
# platform rules known from the project (TikTok Creator Rewards: over one minute; 9:16 for vertical feeds)
o["checks"]={"over_one_minute":d>60.0,"within_65s":d<=65.0,"vertical_9x16":abs(o["aspect"]-0.5625)<0.02,
"loudness_ok(-16..-12 target, -24..-10 tolerated)":(o["loudness_lufs"] is not None and -24<=o["loudness_lufs"]<=-10),
"true_peak_ok(<=-1)":(o["true_peak_dbtp"] is not None and o["true_peak_dbtp"]<=-1.0)}
json.dump(o,open(sys.argv[1],"w"),indent=1)
print(json.dumps(o))
PY
