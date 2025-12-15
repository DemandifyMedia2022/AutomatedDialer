FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

WORKDIR /app/apps/backend

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the API port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
