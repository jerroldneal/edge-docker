# Edge TTS MCP Server (Docker)

A standalone Model Context Protocol (MCP) server that provides text-to-speech conversion using Microsoft Edge TTS. This server runs in Docker and can be used with any MCP-compatible client, including VS Code extensions.

**No Claude Desktop required** - this is a pure MCP server implementation.

## Features

- 🎤 **Text-to-Speech**: Convert text to speech using Microsoft Edge TTS
- 🔊 **MP3 Playback**: Play any MP3 file from host or Docker container
- 🌍 **Multiple Voices**: Support for 100+ voices in 40+ languages
- 🐳 **Docker-Based**: Isolated, reproducible environment
- 🔌 **MCP Protocol**: Standard stdio transport for easy integration
- 📦 **Standalone**: No external dependencies beyond Docker
- 🎵 **HTTP Service**: Express HTTP proxy service for easy Copilot integration

## Quick Start

### Prerequisites

- Docker Desktop installed and running
- Git Bash (Windows) or standard bash shell
- VS Code with MCP client support (optional, for VS Code integration)

### Installation

1. **Clone or download this repository**

2. **Run the setup script:**
   ```bash
   ./edge-tts-mcp-docker-setup.sh
   ```

   This will:
   - Create the MCP server files
   - Build the Docker image
   - Test the server
   - Display configuration instructions

3. **Configure your MCP client** (e.g., VS Code settings.json):
   ```json
   {
     "mcp.servers": {
       "edge-tts": {
         "command": "docker",
         "args": ["run", "--rm", "-i", "edge-tts-mcp"],
         "description": "Edge TTS MCP Server - Text-to-Speech conversion"
       }
     }
   }
   ```

4. **Reload VS Code** if using with VS Code extensions

## HTTP Service (Port 3006)

An Express HTTP service provides easy integration with GitHub Copilot:

### `/speak-from-file` - Text-to-Speech
Convert text to speech from a file and play audio
```bash
GET http://localhost:3006/speak-from-file?filePath=C:/temp/message.txt
```

### `/play-mp3` - MP3 Playback (NEW! 🎵)
Play any MP3 file from host filesystem or Docker container
```bash
GET http://localhost:3006/play-mp3?filePath=C:/temp/audio.mp3
GET http://localhost:3006/play-mp3?filePath=/tmp/output.mp3
```

**Features:**
- ✅ Play files from Windows host filesystem
- ✅ Play files from Docker container (auto-copied to host)
- ✅ Full duration playback with Windows MediaPlayer
- ✅ File size and status reporting

### `/speak-debug-output` - Save & Play
Generate MP3 and copy to C:/temp for inspection
```bash
GET http://localhost:3006/speak-debug-output?filePath=C:/temp/message.txt
```

See [MP3_PLAYBACK_FEATURE.md](MP3_PLAYBACK_FEATURE.md) for detailed documentation.

## Available MCP Tools

### 1. `speak`

Convert text to speech and save as MP3 file.

**Parameters:**
- `text` (required): Text to convert to speech
- `voice` (optional): Voice name (default: "en-US-AriaNeural")
- `output_file` (optional): Output path (default: "/tmp/output.mp3")

**Example:**
```json
{
  "name": "speak",
  "arguments": {
    "text": "Hello, this is a test of Edge TTS",
    "voice": "en-US-AriaNeural"
  }
}
```

### 2. `list_voices`

List all available Edge TTS voices.

**Parameters:**
- `language` (optional): Filter by language code (e.g., "en-US", "es-ES")

**Example:**
```json
{
  "name": "list_voices",
  "arguments": {
    "language": "en-US"
  }
}
```

## Popular Voices

| Voice | Language | Gender |
|-------|----------|--------|
| en-US-AriaNeural | English (US) | Female |
| en-US-GuyNeural | English (US) | Male |
| en-GB-RyanNeural | English (UK) | Male |
| en-GB-SoniaNeural | English (UK) | Female |
| es-ES-ElviraNeural | Spanish (Spain) | Female |
| fr-FR-DeniseNeural | French (France) | Female |
| de-DE-KatjaNeural | German (Germany) | Female |
| ja-JP-NanamiNeural | Japanese | Female |

## Testing

### Test MCP Protocol

```bash
# Initialize the server
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | docker run --rm -i edge-tts-mcp
```

### Test Text-to-Speech Tool

```bash
# Start the container interactively
docker run --rm -i edge-tts-mcp

# Then send (paste this JSON and press Enter):
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"speak","arguments":{"text":"Hello world"}}}
```

## Architecture

```
┌─────────────────────┐
│ GitHub Copilot      │  HTTP GET/POST requests
└──────────┬──────────┘
           │
           │ http://localhost:3006
           │
┌──────────▼──────────┐
│  HTTP Service       │  Express.js (Node.js)
│  edge-tts-service   │  - /speak-from-file
│  (Port 3006)        │  - /play-mp3 ⭐ NEW
└──────────┬──────────┘  - /speak-debug-output
           │
           │ docker exec (MCP JSON-RPC)
           │ docker cp (file transfer)
           │
┌──────────▼──────────┐
│  Docker Container   │  Persistent: edge-tts
│  (edge-tts-mcp)     │  Restart: always
│  ┌────────────────┐ │
│  │  Python 3.12   │ │
│  │  + MCP SDK     │ │
│  │  + Edge TTS    │ │
│  │  + server.py   │ │
│  └────────────────┘ │
└─────────────────────┘
           │
           │ PowerShell
           ▼
┌─────────────────────┐
│  Windows Audio      │  MediaPlayer (PresentationCore)
│  Playback           │  Full duration support
└─────────────────────┘
```

## File Structure

```
edge-docker/
├── edge-tts-mcp-docker-setup.sh   # Setup script
├── edge-tts-mcp/                  # MCP server (Docker)
│   ├── Dockerfile                 # Docker image definition
│   ├── requirements.txt           # Python dependencies
│   └── server.py                  # MCP server implementation
├── service/                       # HTTP Service (Node.js)
│   └── edge-tts-service.js        # Express HTTP proxy + MP3 playback
├── MP3_PLAYBACK_FEATURE.md        # MP3 playback documentation
├── QUICK_REFERENCE.md             # Quick reference guide
├── QUICKSTART.md                  # Quick start guide
├── SETUP_SUMMARY.md               # Setup summary
└── README.md                      # This file
```

## Development

### Rebuild the Docker Image

```bash
cd edge-tts-mcp
docker build -t edge-tts-mcp .
```

### Modify the Server

Edit `edge-tts-mcp/server.py` to add new tools or modify existing ones, then rebuild.

### View Logs

```bash
# Add --debug flag to see detailed logs
docker run --rm -i edge-tts-mcp --debug
```

## Integration Examples

### Use with VS Code Extension

Any VS Code extension that supports MCP can use this server. Add the configuration to your `settings.json` as shown above.

### Use with Custom MCP Client

```python
from mcp.client import Client
from mcp.client.stdio import StdioClientTransport
import subprocess

# Start the Docker container
process = subprocess.Popen(
    ["docker", "run", "--rm", "-i", "edge-tts-mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Create MCP client
transport = StdioClientTransport(
    command="docker",
    args=["run", "--rm", "-i", "edge-tts-mcp"]
)

client = Client(...)
await client.connect(transport)

# Use the tools
result = await client.call_tool("speak", {"text": "Hello!"})
```

## Troubleshooting

### Server doesn't start
- Ensure Docker Desktop is running
- Check Docker is accessible: `docker ps`
- Rebuild the image: `cd edge-tts-mcp && docker build -t edge-tts-mcp .`

### VS Code doesn't recognize the server
- Verify settings.json has the correct configuration
- Reload VS Code window (Ctrl+Shift+P → "Reload Window")
- Check VS Code supports MCP (requires compatible extension)

### Audio file not accessible
- The audio is saved inside the Docker container at `/tmp/output.mp3`
- To access files, mount a volume: `docker run --rm -i -v /host/path:/tmp edge-tts-mcp`

## License

This project uses:
- [edge-tts](https://github.com/rany2/edge-tts) - Microsoft Edge TTS implementation
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/python-sdk) - MCP Python SDK

## Contributing

Feel free to open issues or submit pull requests to improve this MCP server.

---

**Note:** This is a standalone MCP server. It does not require Claude Desktop or any specific client. Any MCP-compatible client can connect to it via stdio transport.
