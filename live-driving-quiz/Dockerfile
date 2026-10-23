FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=7860 QUIZ_BIND_HOST=0.0.0.0
WORKDIR /home/node/app
RUN chown node:node /home/node/app
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node . .
RUN node bank-media.mjs
EXPOSE 7860
CMD ["node", "server.mjs"]
