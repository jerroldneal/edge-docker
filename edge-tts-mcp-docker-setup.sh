#!/bin/bash

# edge-tts-mcp-docker-setup.sh
# Setup for Edge TTS MCP Server in Docker for VS Code MCP Client
# Creates a Docker-based MCP server that VS Code can connect to via stdio transport
#
# Prerequisites:
# - Docker Desktop installed and running
# - VS Code with MCP support (GitHub Copilot or other MCP-enabled extensions)
# - Git Bash (Windows) or standard bash shell
#
# This script creates a standalone MCP server - no Claude Desktop required

# Exit on error
set -e

# Project directory
PROJECT_DIR="edge-tts-mcp"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "Step 1: Creating Dockerfile..."
cat << EOF > Dockerfile
# Dockerfile
FROM python:3.12-slim

# Install system deps
RUN apt-get update && apt-get install -y \\
    ffmpeg \\
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy server script
COPY server.py .

# Expose MCP port
EXPOSE 8080

# Run server
CMD ["python", "server.py"]
EOF

echo "Step 2: Creating requirements.txt..."
cat << EOF > requirements.txt
# requirements.txt
edge-tts>=6.1.0
mcp>=1.0.0
EOF

echo "Step 3: Creating server.py..."
cat << 'EOF' > server.py
#!/usr/bin/env python3
"""
Edge TTS MCP Server
Provides text-to-speech conversion via Model Context Protocol (MCP)
Compatible with VS Code MCP clients
"""
import asyncio
import sys
import os
import edge_tts
from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

# Initialize MCP server
server = Server("edge-tts")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    """List available tools for the MCP client"""
    return [
        types.Tool(
            name="speak",
            description="Convert text to speech using Microsoft Edge TTS and save as MP3 file",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to convert to speech"
                    },
                    "voice": {
                        "type": "string",
                        "description": "Voice name (e.g., en-US-AriaNeural, en-GB-RyanNeural)",
                        "default": "en-US-AriaNeural"
                    },
                    "output_file": {
                        "type": "string",
                        "description": "Output file path (optional, defaults to /tmp/output.mp3)",
                        "default": "/tmp/output.mp3"
                    }
                },
                "required": ["text"]
            }
        ),
        types.Tool(
            name="list_voices",
            description="List all available Edge TTS voices",
            inputSchema={
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "description": "Filter by language code (e.g., en-US, es-ES). Optional."
                    }
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    """Handle tool calls from MCP client"""

    if name == "speak":
        text = arguments.get("text", "")
        voice = arguments.get("voice", "en-US-AriaNeural")
        output_file = arguments.get("output_file", "/tmp/output.mp3")

        if not text:
            return [types.TextContent(
                type="text",
                text="Error: 'text' parameter is required"
            )]

        try:
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            # Generate speech
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_file)

            # Get file size
            file_size = os.path.getsize(output_file)

            return [types.TextContent(
                type="text",
                text=f"✅ Text-to-speech conversion successful!\n\n"
                     f"📝 Text: \"{text[:100]}{'...' if len(text) > 100 else ''}\"\n"
                     f"🎤 Voice: {voice}\n"
                     f"💾 Output: {output_file}\n"
                     f"📊 Size: {file_size:,} bytes"
            )]

        except Exception as e:
            return [types.TextContent(
                type="text",
                text=f"❌ Error generating speech: {str(e)}"
            )]

    elif name == "list_voices":
        language_filter = arguments.get("language")

        try:
            voices = await edge_tts.list_voices()

            if language_filter:
                voices = [v for v in voices if v.get("Locale", "").startswith(language_filter)]

            # Format voice list
            voice_list = []
            for v in voices[:50]:  # Limit to first 50
                name = v.get("ShortName", "Unknown")
                locale = v.get("Locale", "Unknown")
                gender = v.get("Gender", "Unknown")
                voice_list.append(f"• {name} ({locale}) - {gender}")

            result = f"🎙️ Available Edge TTS Voices ({len(voices)} total"
            if language_filter:
                result += f", filtered by '{language_filter}'"
            result += "):\n\n" + "\n".join(voice_list)

            if len(voices) > 50:
                result += f"\n\n... and {len(voices) - 50} more voices"

            return [types.TextContent(type="text", text=result)]

        except Exception as e:
            return [types.TextContent(
                type="text",
                text=f"❌ Error listing voices: {str(e)}"
            )]

    else:
        return [types.TextContent(
            type="text",
            text=f"❌ Unknown tool: {name}"
        )]

async def main():
    """Run the MCP server with stdio transport"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
EOF

echo "Step 4: Building Docker image..."
docker build -t edge-tts-mcp .

echo "Step 5: Testing MCP server..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | docker run --rm -i edge-tts-mcp | head -c 200
echo ""
echo ""

echo "✅ Docker image built and tested successfully!"
echo ""
echo "📋 MCP Server Configuration for VS Code:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add this to your VS Code settings.json:"
echo ""
cat << 'SETTINGS'
{
  "mcp.servers": {
    "edge-tts": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "edge-tts-mcp"],
      "description": "Edge TTS MCP Server - Text-to-Speech conversion"
    }
  }
}
SETTINGS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Settings file location: $APPDATA/Code/User/settings.json"
echo ""
echo "🔧 Available MCP Tools:"
echo "  • speak(text, voice, output_file) - Convert text to speech"
echo "  • list_voices(language) - List available TTS voices"
echo ""
echo "🧪 Test the server manually:"
echo "  docker run --rm -i edge-tts-mcp"
echo ""
echo "📚 Usage from VS Code MCP client extensions:"
echo "  - The server will be available to any MCP-compatible VS Code extension"
echo "  - Use the 'edge-tts' server name to access the tools"
echo "  - No Claude Desktop required - this is a standalone MCP server"
echo ""
echo "✨ Setup complete! Configure VS Code settings and reload the window."
