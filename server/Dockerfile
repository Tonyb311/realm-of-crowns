FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY database/package.json ./database/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=server --workspace=shared --workspace=database

# Copy source code
COPY shared/ ./shared/
COPY database/ ./database/
COPY server/ ./server/

# Generate Prisma client
RUN npx prisma generate --schema=database/prisma/schema.prisma

# Build shared first, then server
RUN npm run build --workspace=shared
RUN npm run build --workspace=server

# --- Production stage ---
FROM node:20-alpine

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

# Copy seeds for db:seed support in container
COPY database/seeds/ ./database/seeds/

EXPOSE 4000

CMD ["node", "server/dist/index.js"]
