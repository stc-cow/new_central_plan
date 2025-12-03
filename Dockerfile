FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --prod

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["node", "server.js"]
