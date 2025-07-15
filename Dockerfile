FROM node:lts
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN chmod +x start.sh
ENV PORT=3000
EXPOSE 3000
CMD ["./start.sh"]
