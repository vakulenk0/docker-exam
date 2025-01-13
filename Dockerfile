FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install && npm install -g npm@11.0.0

COPY . .

#EXPOSE: Указывает, какой порт внутри контейнера будет открыт для внешнего мира.
#3000: Это порт, на котором обычно работают приложения Node.js.
EXPOSE 3000

# CMD ["npm", "run", "dev"]