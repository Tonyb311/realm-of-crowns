FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY database/package.json ./database/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ ./shared/
COPY database/ ./database/
COPY server/ ./server/
COPY client/ ./client/

# Generate Prisma client
RUN cd database && pnpm exec prisma generate --schema=prisma/schema.prisma

# Build shared first, then server and client
RUN pnpm --filter @realm-of-crowns/shared build
RUN pnpm --filter @realm-of-crowns/server build
RUN cd client && pnpm exec vite build

# --- Production stage ---
FROM node:20-alpine

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY database/package.json ./database/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy generated Prisma client from builder (avoids needing prisma CLI in prod)
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/ ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/ ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/

# Copy Prisma schema for migrations at startup
COPY database/prisma/ ./database/prisma/

# Copy built output
COPY --from=builder /app/shared/dist/ ./shared/dist/
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/client/dist/ ./client/dist/

# Copy tsconfig for tsconfig-paths runtime resolution
COPY server/tsconfig.production.json ./server/tsconfig.json

# Copy seeds and production tsconfig for db:seed support in container
COPY database/seeds/ ./database/seeds/
COPY database/tsconfig.production.json ./database/tsconfig.json

# Setup pnpm global bin and install tsx + prisma CLI for startup
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN pnpm add -g tsx prisma@5.22.0

ENV NODE_ENV=production
EXPOSE 4000

RUN addgroup --system app && adduser --system --ingroup app app
RUN chown -R app:app $PNPM_HOME
USER app

WORKDIR /app/server
CMD ["sh", "-c", "prisma migrate deploy --schema=/app/database/prisma/schema.prisma && cd /app/database && tsx --require tsconfig-paths/register seeds/index.ts && cd /app/server && node -r tsconfig-paths/register dist/index.js"]
