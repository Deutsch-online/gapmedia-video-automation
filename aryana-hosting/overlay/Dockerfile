FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json requirements.txt requirements-voice.txt ./
RUN npm ci --omit=dev --ignore-scripts && python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu && /opt/venv/bin/pip install --no-cache-dir -r requirements-voice.txt
COPY tools/prepare-voice-assets.py /tmp/prepare-voice-assets.py
RUN /opt/venv/bin/python /tmp/prepare-voice-assets.py /opt/aryana-voice-assets
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake libgomp1 && rm -rf /var/lib/apt/lists/*
RUN CC=gcc CXX=g++ CMAKE_BUILD_PARALLEL_LEVEL=2 CMAKE_ARGS='-DGGML_NATIVE=OFF -DGGML_CUDA=OFF -DLLAMA_CURL=OFF' /opt/venv/bin/pip install --no-cache-dir --no-binary=llama-cpp-python llama-cpp-python==0.3.16
COPY tools/prepare-chat-model.py /tmp/prepare-chat-model.py
RUN /opt/venv/bin/python /tmp/prepare-chat-model.py /opt/aryana-chat/qwen.gguf
COPY . .
RUN /opt/venv/bin/python tools/prepare-avatar-ui.py
RUN mkdir -p .private && chown -R node:node /app
USER node
ENV PORT=7860 ARYANA_PYTHON=/opt/venv/bin/python ARYANA_CHAT_MODEL=/opt/aryana-chat/qwen.gguf
EXPOSE 7860
CMD ["node","src/server.mjs"]
