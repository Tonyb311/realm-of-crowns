FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build shared first, then client
RUN pnpm --filter @realm-of-crowns/shared build
RUN pnpm --filter @realm-of-crowns/client build

# --- Nginx stage ---
FROM nginx:alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
