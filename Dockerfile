# ── Stage 1: build React frontend ─────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY tailwind.config.js postcss.config.js ./
COPY src ./src
RUN npm run build

# ── Stage 2: Python backend + static assets ──────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=80101

WORKDIR /app

COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY server ./server
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 80101

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:80101/api/memory').read()" || exit 1

CMD ["python", "server/backend.py"]
