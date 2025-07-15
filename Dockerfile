FROM node:lts AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:lts

# Install system packages as root so the MySQL client is available
USER root
RUN apt-get update \
    && apt-get install -y netcat-openbsd default-mysql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node server.js start.sh config.js dbsteps.txt ./
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node routes ./routes
COPY --chown=node:node utils ./utils
COPY --chown=node:node views ./views
COPY --chown=node:node public ./public
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/public/dist ./public/dist
RUN chmod +x start.sh
# Ensure files are owned by the non-privileged user before dropping privileges
RUN mkdir -p /app/logs && chown -R node:node /app

# Drop privileges when running the application
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["./start.sh"]
