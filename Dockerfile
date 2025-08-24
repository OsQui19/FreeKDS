FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run generate:sdk
RUN npm run build
RUN npm prune --production

FROM node:22

# Install system packages as root so the MySQL client is available
USER root
RUN apt-get update \
    && apt-get install -y curl netcat-openbsd default-mysql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --chown=node:node --from=builder /app .
RUN chmod +x start.sh
# Ensure files are owned by the non-privileged user before dropping privileges
RUN mkdir -p /app/logs && chown -R node:node /app

# Drop privileges when running the application
USER node
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
# Container healthcheck: ensure the server responds before marking healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s CMD curl -f http://localhost:$PORT/health || exit 1
CMD ["./start.sh"]
