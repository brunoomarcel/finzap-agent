# Use official Node.js 22 LTS lightweight image for native WebSocket support
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

# Copy application source code
COPY . .

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules and built app from builder stage
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]
