---
title: Aryana private neural lip sync
emoji: 🎙️
colorFrom: green
colorTo: blue
sdk: gradio
sdk_version: 5.49.1
python_version: '3.10'
app_file: app.py
pinned: false
tags:
- aryana-neural-worker
---
Private audio-conditioned speech worker for the approved Aryana character.
The reference video is prepared once. Each reply generates a mouth patch from its exact audio.
ZeroGPU calls are bounded to 180 seconds for preparation and 120 seconds for one reply.
No hourly GPU instance is requested.
