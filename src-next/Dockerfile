# IITP Student Test Interface - Next.js + Bun
#
# In Coolify, set Base Directory to: src-next
#
# @iitpulse/ui is a private package on GitHub Packages. The build needs a classic read:packages token as the
# build argument NPM_TOKEN (Coolify: a build-time variable). It is used only in the `deps` stage, which the
# final image does not include, and only inside one RUN that writes and then deletes a temporary ~/.npmrc.
# The committed .npmrc holds just the registry line, never a token.
#
#   docker build --build-arg NPM_TOKEN=... -t iitp-student .
#
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (discarded stage: its layers and its ARG never reach the release image)
FROM base AS deps
COPY package.json bun.lock .npmrc ./
ARG NPM_TOKEN
# The token is read with printenv, never written as $NPM_TOKEN in this RUN line: BuildKit prints each RUN with
# build arguments expanded, which would put the token in the build log.
RUN if [ -z "$(printenv NPM_TOKEN)" ]; then echo "Build argument NPM_TOKEN (read:packages) is required to install @iitpulse/ui" >&2; exit 1; fi; \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(printenv NPM_TOKEN)" > /root/.npmrc; \
    bun install --frozen-lockfile; status=$?; \
    rm -f /root/.npmrc; rm -rf /root/.bun/install/cache; \
    exit $status

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_GATEWAY
ENV NEXT_PUBLIC_API_GATEWAY=${NEXT_PUBLIC_API_GATEWAY}

# Ensure public folder exists for build
RUN mkdir -p public

# Build Next.js app
RUN bun run build

# Production stage
FROM base AS release
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Copy standalone build
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3001

CMD ["bun", "run", "server.js"]
