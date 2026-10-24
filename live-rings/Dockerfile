FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts --no-audit --no-fund && node -e "import('tiktok-live-connector')"
COPY server.mjs model.mjs connection.mjs ./
COPY public ./public
RUN chown -R node:node /app
USER node
ENV PORT=7860
EXPOSE 7860
CMD ["node","server.mjs"]
