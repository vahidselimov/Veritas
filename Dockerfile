# =============================================================================
# VERITAS // CORPUS - Multi-Engine Production Dockerfile (.NET 9 + Next.js 14)
# =============================================================================

# --- Stage 1: Build .NET 9 Core Web API ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-builder
WORKDIR /src

# Copy project files and restore dependencies
COPY backend/src/Veritas.Core.Domain/*.csproj backend/src/Veritas.Core.Domain/
COPY backend/src/Veritas.Core.Infrastructure/*.csproj backend/src/Veritas.Core.Infrastructure/
COPY backend/src/Veritas.Core.Api/*.csproj backend/src/Veritas.Core.Api/
RUN dotnet restore backend/src/Veritas.Core.Api/Veritas.Core.Api.csproj

# Copy remaining source code and publish
COPY backend/ backend/
RUN dotnet publish backend/src/Veritas.Core.Api/Veritas.Core.Api.csproj \
    -c Release \
    -o /app/backend-publish \
    --no-restore

# --- Stage 2: Build Next.js 14 Production Bundle ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# --- Stage 3: Unified Production Runtime ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install ASP.NET Core 9.0 Runtime & Supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    supervisor \
    curl \
    && wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends aspnetcore-runtime-9.0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV ASPNETCORE_URLS=http://127.0.0.1:5000
ENV CORE_API_URL=http://127.0.0.1:5000

# Copy Next.js artifacts
COPY --from=frontend-builder /app/package.json /app/package-lock.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/next.config.mjs ./

# Copy .NET API artifacts
COPY --from=backend-builder /app/backend-publish /app/backend

# Supervisor configuration to manage both processes
RUN mkdir -p /var/log/supervisor /etc/supervisor/conf.d
RUN printf "[supervisord]\nnodaemon=true\nlogfile=/var/log/supervisor/supervisord.log\npidfile=/var/run/supervisord.pid\n\n[program:dotnet-api]\ncommand=dotnet /app/backend/Veritas.Core.Api.dll --urls http://127.0.0.1:5000\ndirectory=/app/backend\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\n\n[program:nextjs-frontend]\ncommand=npm run start -- -p 3000\ndirectory=/app\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\n" > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
