FROM node:20-alpine
WORKDIR /api

COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
