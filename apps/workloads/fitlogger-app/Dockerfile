# Multi-stage build for Fitlogger web application
# Fully compatible with Kaniko and Buildah daemonless rootless builders

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Run as built-in non-root user (node:node)
USER node

# Copy dependencies and application files with proper ownership
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public

EXPOSE 3000

CMD ["node", "server.js"]
