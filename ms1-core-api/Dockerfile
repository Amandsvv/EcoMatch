# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/migrations ./migrations

RUN mkdir -p /app/logs \
    && chown -R node:node /app/logs

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
CMD node -e "require('http').get('http://localhost:4000/health', (res)=>{if(res.statusCode!==200)process.exit(1);res.resume();res.on('end',()=>process.exit(0));}).on('error',()=>process.exit(1));"

CMD ["node", "dist/index.js"]