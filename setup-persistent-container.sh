#!/bin/bash
# Setup persistent edge-tts MCP server container
# This container runs continuously and restarts automatically

set -e

CONTAINER_NAME="edge-tts"
IMAGE_NAME="edge-tts-mcp"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎙️  Edge TTS Persistent Container Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if image exists
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "❌ Error: Docker image '$IMAGE_NAME' not found"
    echo "   Please run edge-tts-mcp-docker-setup.sh first to build the image"
    exit 1
fi

echo "✅ Found Docker image: $IMAGE_NAME"

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
# - Interactive mode with stdin open
# - Detached mode (runs in background)
# - Keep stdin open for MCP communication
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    -i \
    "$IMAGE_NAME" \
    python server.py

echo "✅ Container created successfully"
echo ""

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 2

# Check container status
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Container is running"
    echo ""
    echo "Container details:"
    docker inspect "$CONTAINER_NAME" --format '  Status: {{.State.Status}}'
    docker inspect "$CONTAINER_NAME" --format '  Started: {{.State.StartedAt}}'
    docker inspect "$CONTAINER_NAME" --format '  Restart Policy: {{.HostConfig.RestartPolicy.Name}}'
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ Setup Complete"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "The edge-tts container will:"
    echo "  • Run continuously in the background"
    echo "  • Restart automatically if it crashes"
    echo "  • Start automatically when Docker starts"
    echo ""
    echo "Useful commands:"
    echo "  docker logs $CONTAINER_NAME        # View logs"
    echo "  docker restart $CONTAINER_NAME     # Restart container"
    echo "  docker stop $CONTAINER_NAME        # Stop container"
    echo "  docker start $CONTAINER_NAME       # Start container"
    echo "  docker rm -f $CONTAINER_NAME       # Remove container"
    echo ""
else
    echo "❌ Error: Container failed to start"
    echo ""
    echo "Container logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
fi
