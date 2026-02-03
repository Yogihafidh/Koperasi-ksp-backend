FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# SOURCE CODE AKAN DI-MOUNT (BUKAN COPY)
EXPOSE 3000

CMD ["npm", "run", "start:dev"]
