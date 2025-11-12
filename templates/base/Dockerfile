# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps/studio ./apps/studio

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build arguments for environment variables needed at build time
ARG ACCESS_API_KEY
ARG GITHUB_TOKEN
ARG RESEND_API_KEY
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG DATABASE_URL

# Set as environment variables for the build
ENV ACCESS_API_KEY=$ACCESS_API_KEY
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV DATABASE_URL=$DATABASE_URL

# Build the application
WORKDIR /app/apps/studio
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

# Copy workspace root files first
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages

# Set working directory for the app
WORKDIR /app/apps/studio

# Copy studio app files
COPY --from=builder /app/apps/studio/build ./build
COPY --from=builder /app/apps/studio/package.json ./package.json
COPY --from=builder /app/apps/studio/node_modules ./node_modules
COPY --from=builder /app/apps/studio/drizzle ./drizzle
COPY --from=builder /app/apps/studio/drizzle.config.ts ./drizzle.config.ts

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_PATH=/app/node_modules

# Start the application
CMD ["node", "build"]
