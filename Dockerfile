# Stage 1: Build
FROM oven/bun:latest AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG FONTAWESOME_PACKAGE_TOKEN
ARG BRYNTUM_USERNAME
ARG BRYNTUM_PASSWORD
ARG VITE_AG_GRID_LICENSE_KEY
ARG VITE_API_URL
ARG VITE_DEVELOPMENT=false
ARG VITE_DOMAIN
ARG VITE_CACHE_ENCRYPTION
ARG VITE_ALLOW_UNVERIFIED_LOGIN
ARG VITE_ALLOW_UNVERIFIED_EMAIL_REGEX

# Set environment variables for build
ENV FONTAWESOME_PACKAGE_TOKEN=$FONTAWESOME_PACKAGE_TOKEN
ENV VITE_AG_GRID_LICENSE_KEY=$VITE_AG_GRID_LICENSE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEVELOPMENT=$VITE_DEVELOPMENT
ENV VITE_DOMAIN=$VITE_DOMAIN
ENV VITE_CACHE_ENCRYPTION=$VITE_CACHE_ENCRYPTION
ENV VITE_ALLOW_UNVERIFIED_LOGIN=$VITE_ALLOW_UNVERIFIED_LOGIN
ENV VITE_ALLOW_UNVERIFIED_EMAIL_REGEX=$VITE_ALLOW_UNVERIFIED_EMAIL_REGEX
# Use placeholder - will be replaced at runtime with SOURCE_COMMIT
ENV VITE_GIT_COMMIT=__RUNTIME_COMMIT__

# Copy package files
COPY package.json bun.lock* bun.lockb* package-lock.json* pnpm-lock.yaml* ./

# Create .npmrc from build args and install dependencies
RUN set -ex && \
    if [ -z "$FONTAWESOME_PACKAGE_TOKEN" ]; then \
      echo "ERROR: FONTAWESOME_PACKAGE_TOKEN is not set!" && exit 1; \
    fi && \
    if [ -z "$BRYNTUM_USERNAME" ] || [ -z "$BRYNTUM_PASSWORD" ]; then \
      echo "ERROR: BRYNTUM_USERNAME and BRYNTUM_PASSWORD must be set!" && exit 1; \
    fi && \
    BRYNTUM_AUTH=$(echo -n "$BRYNTUM_USERNAME:$BRYNTUM_PASSWORD" | base64) && \
    echo "@fortawesome:registry=https://npm.fontawesome.com" > .npmrc && \
    echo "@awesome.me:registry=https://npm.fontawesome.com" >> .npmrc && \
    echo "//npm.fontawesome.com/:_authToken=$FONTAWESOME_PACKAGE_TOKEN" >> .npmrc && \
    echo "@bryntum:registry=https://npm.bryntum.com" >> .npmrc && \
    echo "//npm.bryntum.com/:_authToken=$BRYNTUM_AUTH" >> .npmrc && \
    echo "=== Starting dependency installation ===" && \
    bun install && \
    echo "=== Dependencies installed successfully ==="

# Copy source code
COPY . .

# Increase Node.js memory limit for large builds
ENV NODE_OPTIONS="--max-old-space-size=16384"

# Build the application
RUN bun run build

# Stage 2: Serve with nginx (tiny image, ~25MB vs ~1GB)
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: all routes serve index.html
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Enable gzip for all text assets\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_min_length 1024;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;\n\
\n\
    # Cache static assets aggressively (hashed filenames)\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # SPA fallback\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Create startup script to inject SOURCE_COMMIT at runtime
RUN printf '#!/bin/sh\n\
COMMIT=${SOURCE_COMMIT:-unknown}\n\
# Shorten to 7 chars if full hash\n\
COMMIT=$(echo "$COMMIT" | cut -c1-7)\n\
# Replace placeholder in all JS files\n\
find /usr/share/nginx/html/assets -name "*.js" -exec sed -i "s/__RUNTIME_COMMIT__/$COMMIT/g" {} \\;\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 3000

CMD ["/docker-entrypoint.sh"]
