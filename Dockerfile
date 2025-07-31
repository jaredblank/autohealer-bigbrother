# Big Brother AutoHealer v2 - Optimized Dockerfile
# Performance: <100ms response, <50MB memory

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package-bigbrother.json package.json
COPY package-lock.json* ./

# Install dependencies with production optimizations
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY src/ ./src/
COPY test/ ./test/
COPY start-bigbrother.sh ./
COPY .env-bigbrother ./.env

# Make startup script executable
RUN chmod +x start-bigbrother.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S autohealer -u 1001

# Set up logs directory
RUN mkdir -p logs && chown -R autohealer:nodejs logs

# Switch to non-root user
USER autohealer

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expose port
EXPOSE 3000

# Big Brother compliance labels
LABEL service="autohealer-bigbrother" \
      version="2.0.0" \
      architecture="big-brother-compliant" \
      max-response-time="100ms" \
      max-memory="50MB" \
      single-responsibility="true" \
      feature-flags="enabled"

# Start the application
CMD ["./start-bigbrother.sh"]