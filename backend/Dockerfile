FROM node:20 AS base
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm install

FROM dependencies AS build
COPY . .
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npm run db:generate
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src ./src

EXPOSE 3000
CMD ["npx", "pm2-runtime", "start", "dist/index.js", "-i", "max"]

FROM dependencies AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
