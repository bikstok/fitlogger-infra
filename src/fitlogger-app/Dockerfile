# Stage 1: Build Svelte 5 Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/fitness-client

COPY fitness-client/package*.json ./
RUN npm ci

COPY fitness-client/ ./
ENV VITE_BASE_URL=""
RUN npm run build

# Stage 2: Production Server Runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=frontend-builder /app/fitness-client/dist ./fitness-client/dist

USER node
EXPOSE 3000

CMD ["node", "server/app.js"]
