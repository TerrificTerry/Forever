FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
