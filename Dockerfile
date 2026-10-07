FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsup.config.ts ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN ln -s /app/dist/bin/kanit.js /usr/local/bin/kanit

USER node

ENTRYPOINT ["node", "/app/dist/bin/kanit.js"]
CMD ["scan"]
