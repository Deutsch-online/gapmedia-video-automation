FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json requirements.txt requirements-voice.txt ./
RUN npm ci --omit=dev --ignore-scripts && python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu && /opt/venv/bin/pip install --no-cache-dir -r requirements-voice.txt
COPY tools/prepare-voice-assets.py /tmp/prepare-voice-assets.py
RUN /opt/venv/bin/python /tmp/prepare-voice-assets.py /opt/aryana-voice-assets
COPY . .
RUN mkdir -p .private && chown -R node:node /app
USER node
ENV PORT=7860 ARYANA_PYTHON=/opt/venv/bin/python
EXPOSE 7860
CMD ["node","src/server.mjs"]
