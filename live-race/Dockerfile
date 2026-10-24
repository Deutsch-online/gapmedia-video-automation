FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY race.mjs server.mjs model.mjs countries.mjs play.mjs connection.mjs seed.json ./
COPY dist ./dist
RUN chown -R node:node /app
USER node
ENV PORT=7860
EXPOSE 7860
CMD ["node","server.mjs"]
