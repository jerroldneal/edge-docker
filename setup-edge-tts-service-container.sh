#!/bin/bash
# Setup persistent edge-tts-service container
# This container runs continuously and restarts automatically

set -e

CONTAINER_NAME="edge-tts-service"
IMAGE_NAME="edge-tts-service"
PORT="${PORT:-3006}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎙️  Edge TTS Service Container Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build Docker image
echo "🔨 Building Docker image..."
cd service
docker build -t "$IMAGE_NAME" .
cd ..

echo "✅ Image built successfully"
echo ""

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  Container '$CONTAINER_NAME' already exists"

    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "✅ Container is already running"
        echo ""
        echo "Container details:"
        docker inspect "$CONTAINER_NAME" --format '  Status: {{.State.Status}}'
        docker inspect "$CONTAINER_NAME" --format '  Started: {{.State.StartedAt}}'
        docker inspect "$CONTAINER_NAME" --format '  Restart Policy: {{.HostConfig.RestartPolicy.Name}}'
        docker port "$CONTAINER_NAME"
        echo ""
        echo "To recreate the container, run:"
        echo "  docker rm -f $CONTAINER_NAME"
        echo "  $0"
        exit 0
    else
        echo "🔄 Container exists but is not running - starting it..."
        docker start "$CONTAINER_NAME"
        echo "✅ Container started"
        exit 0
    fi
fi

echo "🚀 Creating persistent container '$CONTAINER_NAME'..."
echo ""

# Create container with:
# - Named container for easy access
# - Restart policy: always (starts on Docker daemon startup)
# - Port mapping for HTTP service
# - Volume mount for temp directory (to copy MP3 files)
# - Docker socket mount (to access edge-tts container)
# - Network access to edge-tts MCP container
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    -p "${PORT}:3006" \
    -v /c/temp:/tmp/audio \
    -v /var/run/docker.sock:/var/run/docker.sock \
    "$IMAGE_NAME"

echo "✅ Container created successfully"
echo ""

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 3

# Check container status
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Container is running"
    echo ""
    echo "Container details:"
    docker inspect "$CONTAINER_NAME" --format '  Status: {{.State.Status}}'
    docker inspect "$CONTAINER_NAME" --format '  Started: {{.State.StartedAt}}'
    docker inspect "$CONTAINER_NAME" --format '  Restart Policy: {{.HostConfig.RestartPolicy.Name}}'
    echo "  Port: http://localhost:${PORT}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ Setup Complete"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "The edge-tts-service container will:"
    echo "  • Run continuously in the background"
    echo "  • Restart automatically if it crashes"
    echo "  • Start automatically when Docker starts"
    echo "  • Listen on http://localhost:${PORT}"
    echo ""
    echo "Useful commands:"
    echo "  docker logs $CONTAINER_NAME             # View logs"
    echo "  docker logs -f $CONTAINER_NAME          # Follow logs"
    echo "  docker restart $CONTAINER_NAME          # Restart container"
    echo "  docker stop $CONTAINER_NAME             # Stop container"
    echo "  docker start $CONTAINER_NAME            # Start container"
    echo "  docker rm -f $CONTAINER_NAME            # Remove container"
    echo ""
    echo "Test endpoints:"
    echo "  curl http://localhost:${PORT}/health"
    echo "  curl http://localhost:${PORT}/"
    echo ""
else
    echo "❌ Error: Container failed to start"
    echo ""
    echo "Container logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
fi
