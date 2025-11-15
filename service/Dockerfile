FROM node:20-slim

# Install Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://get.docker.com -o get-docker.sh \
    && sh get-docker.sh \
    && rm get-docker.sh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy service code
COPY edge-tts-service.js ./

# Expose port
EXPOSE 3006

# Set default port
ENV PORT=3006
ENV HOST=0.0.0.0

# Run service
CMD ["node", "edge-tts-service.js"]
