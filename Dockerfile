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
RUN chmod +x start.sh

# Drop privileges when running the application
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["./start.sh"]
