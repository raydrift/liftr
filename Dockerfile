FROM node:20-alpine
WORKDIR /app

COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

COPY api/src/ ./src/
COPY api/server.js ./
COPY frontend/ ./frontend/

EXPOSE 3000
CMD ["node", "server.js"]
