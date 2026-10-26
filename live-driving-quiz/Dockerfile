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
# Server recognition avoids Edge/Chrome cloud speech services; CPU only.
RUN python3 -m venv /home/node/asr-env && /home/node/asr-env/bin/pip install --no-cache-dir faster-whisper==1.2.1 av==16.1.0
RUN HF_HUB_DISABLE_XET=1 /home/node/asr-env/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-small',revision='536b0662742c02347bc0e980a01041f333bce120',local_dir='/home/node/asr-model',allow_patterns=['config.json','model.bin','tokenizer.json','vocabulary.*'])"
ENV QUIZ_ASR_PYTHON=/home/node/asr-env/bin/python QUIZ_ASR_MODEL=/home/node/asr-model
# Separate CPU-only tone-conversion runtime; no CUDA or paid inference service.
RUN python3 -m venv /home/node/clone-env && /home/node/clone-env/bin/pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
RUN /home/node/clone-env/bin/pip install --no-cache-dir numpy==1.26.4 librosa==0.10.2.post1 soundfile==0.12.1 eng_to_ipa==0.0.2 inflect==7.0.0 unidecode==1.3.7 pypinyin==0.50.0 cn2an==0.5.22 jieba==0.42.1
COPY --chown=node:node prepare-owner-voice.py ./
RUN python3 prepare-owner-voice.py /home/node/owner-voice-assets
ENV QUIZ_CLONE_PYTHON=/home/node/clone-env/bin/python QUIZ_CLONE_ASSETS=/home/node/owner-voice-assets
COPY --chown=node:node . .
RUN node bank-media.mjs
EXPOSE 7860
CMD ["node", "server.mjs"]
