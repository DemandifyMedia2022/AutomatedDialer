FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for build and runtime (wget for healthcheck)
RUN apk add --no-cache python3 make g++ openssl bash wget curl

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN npm install

# Copy source code
COPY --chown=node:node . .

WORKDIR /app/apps/backend

# Generate Prisma Client (needs schema file)
RUN npx prisma generate

# Build the application
RUN npm run build

# Copy and set up entrypoint script before switching user
COPY apps/backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose the API port
EXPOSE 4000

# Use entrypoint to wait for DB, construct DATABASE_URL, then start
ENTRYPOINT ["/app/docker-entrypoint.sh"]
USER node
CMD ["npm", "start"]
