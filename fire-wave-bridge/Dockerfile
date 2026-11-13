FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY server.mjs ./
ENV PORT=7860
EXPOSE 7860
CMD ["node","server.mjs"]
