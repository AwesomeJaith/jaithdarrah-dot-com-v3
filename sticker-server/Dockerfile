FROM node:25-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:25-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Pre-download RMBG-1.4 model so first request is fast
ENV TRANSFORMERS_CACHE=/app/.model-cache
RUN node --input-type=module -e "\
  import { pipeline } from '@huggingface/transformers'; \
  await pipeline('image-segmentation', 'briaai/RMBG-1.4', { device: 'cpu', dtype: 'fp32' }); \
  console.log('Model cached');"

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
