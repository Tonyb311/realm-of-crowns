FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm ci --workspace=client --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY client/ ./client/

# Build shared first, then client
RUN npm run build --workspace=shared
RUN npm run build --workspace=client

# --- Nginx stage ---
FROM nginx:alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
