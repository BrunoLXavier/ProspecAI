# Frontend Dockerfile
FROM node:20-bullseye-slim

WORKDIR /app

# Copy package files and install only production dependencies (omit dev deps like Playwright)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
