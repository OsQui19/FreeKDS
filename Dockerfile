FROM node:lts

# Install system packages as root so the MySQL client is available
USER root
RUN apt-get update \
    && apt-get install -y netcat-openbsd default-mysql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN chmod +x start.sh

# Ensure files are owned by the non-privileged user before dropping privileges
RUN chown -R node:node /app

# Drop privileges when running the application
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["./start.sh"]
