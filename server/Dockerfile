FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY database/package.json ./database/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY shared/ ./shared/
COPY database/ ./database/
COPY server/ ./server/
COPY client/ ./client/

# Generate Prisma client
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Build shared first, then server and client
RUN npm run build --workspace=shared
RUN npm run build --workspace=server
RUN cd client && npx vite build

# --- Production stage ---
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY database/package.json ./database/

# Install production dependencies only
RUN npm ci --workspace=server --workspace=shared --workspace=database --omit=dev

# Copy Prisma schema and generate client for production
COPY database/prisma/ ./database/prisma/
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Copy built output
COPY --from=builder /app/shared/dist/ ./shared/dist/
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/client/dist/ ./client/dist/

# Copy tsconfig for tsconfig-paths runtime resolution
COPY server/tsconfig.production.json ./server/tsconfig.json

# Copy seeds and production tsconfig for db:seed support in container
COPY database/seeds/ ./database/seeds/
COPY database/tsconfig.production.json ./database/tsconfig.json

# Install tsx globally for running TypeScript seeds at startup
RUN npm install -g tsx

ENV NODE_ENV=production
EXPOSE 4000

RUN addgroup --system app && adduser --system --ingroup app app
USER app

WORKDIR /app/server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=../database/prisma/schema.prisma && cd /app/database && tsx --require tsconfig-paths/register seeds/index.ts && cd /app/server && node -r tsconfig-paths/register dist/index.js"]
