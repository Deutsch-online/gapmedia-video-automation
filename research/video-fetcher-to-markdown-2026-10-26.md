# Video Fetcher to Markdown — reviewed 2026-10-26

- Repository: https://github.com/JimmySadek/video-fetcher-to-markdown
- Reviewed commit: `c196ba48df72c064811adcb934104c3e6567858b`.
- License: MIT, copyright GimySadek (2026).
- Evidence: repository metadata, README, requirements.txt, LICENSE and scripts/fetch_media.py read. No external video extraction was executed; platform access has not been validated from our host.

## Useful for this project

Keep source-linked transcripts of German driving lessons and visual/video references in a searchable Markdown archive. A note preserves creator, original URL, description, language, chapters when supplied by the source, and caption/transcription provenance. Obsidian is optional: its output is ordinary Markdown, not an automatic sync service.

YouTube caption capture uses youtube-transcript-api and requests, with no API key. Missing captions can use the media workflow. Other supported sites/local videos use yt-dlp, ffmpeg/ffprobe and a local Whisper CLI. Short clips up to 180 seconds can receive a contact sheet. Frames are evidence for later visual inspection, not automatic proof of visual understanding.

## Constraints verified in code

- It transcribes and archives; it does not generate videos, teach Persian phonetics, clone voices or supply TikTok analytics/LIVE access.
- No API key does not mean no compute/network cost. Downloading model weights, storing media and running Whisper uses local resources. Keep CPU-only/free-host policy and bound the input length before any future integration.
- Our existing faster-whisper worker is not a drop-in replacement for the `whisper`/`mlx_whisper` CLIs expected by this project. Do not install a duplicate heavy model automatically. Prefer reusing existing transcription through an explicit adapter if this is integrated later.
- Metadata/captions/chapters depend on availability. Login walls, private media, geographic restrictions and platform changes can block extraction. Exit 4 signals login/blocking. Browser cookies are used only with an explicit flag; nothing was connected here.
- A transcript is not a phonetic ground truth: Whisper may normalize an incorrectly spoken word to its expected spelling. It cannot certify an accent or replace owner pronunciation feedback.
- For Persian/German learning, preserve the original language and provenance; source words are examples, not authority over the reviewed question answer bank.

## Decision

Useful as a reference for research/video-to-notes ingestion. Saved in the project sources. Reference only: no package installed, credentials requested, paid API activated, external samples uploaded or recurring job enabled.

Source files:
- https://github.com/JimmySadek/video-fetcher-to-markdown/blob/c196ba48df72c064811adcb934104c3e6567858b/README.md
- https://github.com/JimmySadek/video-fetcher-to-markdown/blob/c196ba48df72c064811adcb934104c3e6567858b/scripts/fetch_media.py
- https://github.com/JimmySadek/video-fetcher-to-markdown/blob/c196ba48df72c064811adcb934104c3e6567858b/requirements.txt
