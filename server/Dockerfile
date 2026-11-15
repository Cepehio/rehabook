# RehaBook backend (Express + Prisma) konteineris.
FROM node:22-alpine

# Prisma engine'ui Alpine sistemoje reikia openssl.
RUN apk add --no-cache openssl

WORKDIR /app/server

# 1) Priklausomybės (atskiras sluoksnis -> geresnis caching).
#    Įdiegiamas ir prisma CLI (devDependency), nes konteineryje paleidžiame
#    `prisma generate` ir `prisma migrate deploy`.
COPY server/package*.json ./
RUN npm ci

# 2) Prisma schema + migracijos ir kliento generavimas.
COPY server/prisma ./prisma
RUN npx prisma generate

# 3) Likęs aplikacijos kodas (node_modules/.env neįtraukiami — žr. .dockerignore).
COPY server/src ./src
COPY server/scripts ./scripts
COPY shared /app/shared

EXPOSE 4000

# Paleidžiant: pritaikomos migracijos (migrate deploy) ir startuoja serveris.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
