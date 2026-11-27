# MoneyPrinterTurbo from GapMedia

GapMedia's topic-only tutorial drafts use the hosted `free-ai` text model by default, with no account or API key. Review the draft before exporting approved narration to a UTF-8 text file. If you intentionally want the previous Gemini drafting provider, set `GAPMEDIA_DRAFT_PROVIDER=gemini` and configure its existing API key.

## Setup

Use [the pinned MoneyPrinterTurbo installation](https://github.com/Deutsch-online/gapmedia-video-pipeline) as a sibling checkout named `MoneyPrinterTurbo`, or set `MONEYPRINTER_DIR` to its absolute path. Install FFmpeg and the Python dependencies in MoneyPrinterTurbo's `.venv`.

For standalone topic-to-script generation in MoneyPrinterTurbo, set these values in the existing `[app]` section of its local `config.toml`. The OpenAI client requires a nonempty placeholder, so `free` is a public string.

```toml
llm_provider = "openai"
openai_api_key = "free"
openai_base_url = "https://api.apisfreellm.com/v1"
openai_model_name = "free-ai"
video_source = "local"
```

## Render a local video

Run from GapMedia with reviewed script text and local media you can use. Repeat `--media` for additional files. Pass `--audio` for an existing narration track. Omitting it produces a silent video.

```sh
npm run video:moneyprinter -- --script approved.txt --media clip.mp4 --audio narration.wav
```

MoneyPrinterTurbo reports the output path under its own `storage/tasks`. This manual command renders a local assembly with no automatic upload. It does not run the daily series workflow or replace its approval and quality gates.
