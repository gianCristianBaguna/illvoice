FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN apt-get update -y && apt-get install -y openssl

COPY prisma.config.ts ./
COPY prisma ./prisma
ARG DATABASE_URL=dummy
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
