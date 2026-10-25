FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=7860 QUIZ_BIND_HOST=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
WORKDIR /home/node/app
RUN chown node:node /home/node/app
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
RUN python3 -m venv /home/node/voice-env && /home/node/voice-env/bin/pip install --no-cache-dir piper-tts==1.3.0 onnxruntime==1.23.2 numpy==2.3.4
ENV QUIZ_TTS_PYTHON=/home/node/voice-env/bin/python
# Keep CPU-generated voices cached when only UI/server code changes.
COPY --chown=node:node data/questions.json ./data/questions.json
COPY --chown=node:node prepare-narration.py speech-texts.json ./
RUN /home/node/voice-env/bin/python prepare-narration.py
COPY --chown=node:node . .
RUN node bank-media.mjs
EXPOSE 7860
CMD ["node", "server.mjs"]
