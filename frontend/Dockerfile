# Frontend Dockerfile
FROM node:20-bullseye-slim

WORKDIR /app

# Install OS packages required by Playwright browsers
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	wget \
	gnupg \
	libnss3 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libcups2 \
	libx11-xcb1 \
	libxcomposite1 \
	libxdamage1 \
	libxrandr2 \
	libgbm1 \
	libasound2 \
	libxss1 \
	libgtk-3-0 \
	libdbus-1-3 \
	libxkbfile1 \
	libxshmfence1 \
	fonts-liberation \
	lsb-release \
	&& rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies (including Playwright devDependency)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Install Playwright browsers (with required deps already present)
RUN npx playwright install --with-deps

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
