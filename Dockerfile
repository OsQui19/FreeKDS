FROM node:lts
RUN apt-get update \
    && apt-get install -y netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN chmod +x start.sh
ENV PORT=3000
EXPOSE 3000
CMD ["./start.sh"]
