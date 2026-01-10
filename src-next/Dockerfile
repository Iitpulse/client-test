# IITP Student Test Interface - Next.js + Bun
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_GATEWAY
ENV NEXT_PUBLIC_API_GATEWAY=${NEXT_PUBLIC_API_GATEWAY}

# Build Next.js app
RUN bun run build

# Production stage
FROM base AS release
ENV NODE_ENV=production
ENV PORT=3001

# Copy standalone build
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3001

CMD ["bun", "run", "server.js"]
