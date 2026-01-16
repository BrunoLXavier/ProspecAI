# Frontend Dockerfile
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Copy only the package.json and install production dependencies (omit dev deps)
# Use `npm install` instead of `npm ci` so the build does not rely on a lockfile
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy source code
COPY . .

# Ensure locales are present inside the image for non-bind-mount deployments
RUN if [ -d src/locales ]; then \
			mkdir -p /app/src/locales && cp -a src/locales/. /app/src/locales/ || true; \
		else \
			echo "[docker build] No src/locales directory found; skipping locales copy"; \
		fi
# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
