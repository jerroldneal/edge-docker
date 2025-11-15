# Copilot Speak Edge - Complete Setup Summary

## What Was Created

### 1. Edge TTS MCP Server (Docker)
**Location:** `edge-tts-mcp/`

Files:
- `Dockerfile` - Container configuration for Python + Edge TTS
- `requirements.txt` - Python dependencies (edge-tts, mcp, uvicorn)
- `server.py` - MCP server implementation with stdio transport
- Built as Docker image: `edge-tts-mcp`

**Purpose:** Provides text-to-speech conversion via MCP protocol

### 2. HTTP Service (Node.js) ⭐ RECOMMENDED
**Location:** `service/`

Files:
- `edge-tts-service.js` - Express HTTP proxy service

**Purpose:** HTTP bridge between Copilot and MCP server

**Features:**
- `/speak-from-file` - Generate TTS and play audio
- `/play-mp3` - Play existing MP3 files (NEW!)
- `/speak-debug-output` - Save MP3 to C:/temp
- Automatic temp file cleanup
- Windows MediaPlayer integration
- Docker file transfer support

**Start Service:**
```bash
PORT=3006 node service/edge-tts-service.js
```

**Persistent Container:**
```bash
docker run -d --name edge-tts \
  --restart always \
  -p 12434:12434 \
  edge-tts-mcp
```

### 3. VS Code Extension
**Location:** `copilot-speak-extension/`

Files:
- `package.json` - Extension manifest and dependencies
- `src/extension.ts` - Chat participant implementation
- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Build configuration
- `README.md` - Extension documentation
- `USAGE.md` - Detailed usage guide

**Purpose:** Adds `@speak-edge` command to GitHub Copilot Chat

### 3. Setup Scripts
- `edge-tts-mcp-docker-setup.sh` - Automated setup for MCP server
- `QUICKSTART.md` - Step-by-step setup guide

## How It Works

### HTTP Service (Recommended)
```
User types in Copilot Chat:
  @workspace /speak Hello world!
         ↓
Copilot creates temp file with text
         ↓
HTTP GET to localhost:3006/speak-from-file
         ↓
Express service (edge-tts-service.js)
         ↓
Docker exec to MCP server (JSON-RPC)
         ↓
Edge TTS generates MP3 (/tmp/output.mp3)
         ↓
Docker cp to host (C:/temp/...)
         ↓
PowerShell MediaPlayer plays audio
         ↓
Service deletes temp file, returns status
```

### VS Code Extension
```
User types in Copilot Chat:
  @speak-edge Hello world!
         ↓
VS Code Extension (extension.ts)
         ↓
Spawns Docker container with MCP server
         ↓
Sends MCP request via stdio
         ↓
Edge TTS converts text to speech
         ↓
Returns audio file location
         ↓
Extension displays result in chat
```

## Setup Status

✅ Docker image built: `edge-tts-mcp`
✅ VS Code settings configured with MCP server
✅ Extension compiled successfully
✅ MCP server tested and responding

## Next Steps

1. **Start HTTP Service (Recommended):**
   ```bash
   PORT=3006 node service/edge-tts-service.js
   ```

2. **Use in Copilot Chat:**
   ```
   @workspace /speak Hello, this is a test!
   @workspace /play-mp3 C:/temp/edge-tts-1234567890.mp3
   ```

3. **Test the Extension (Optional):**
   ```bash
   # Press F5 in VS Code to launch Extension Development Host
   ```

4. **Use Extension in Copilot Chat:**
   ```
   @speak-edge Hello, this is a test of the text-to-speech system!
   ```

3. **Package for Distribution (Optional):**
   ```bash
   cd copilot-speak-extension
   npm install -g @vscode/vsce
   vsce package
   # Creates: copilot-speak-edge-0.0.1.vsix
   ```

## Architecture Details

### MCP Server (server.py)
- **Transport:** stdio (standard input/output)
- **Protocol:** Model Context Protocol (MCP)
- **Tool:** `speak(text, voice)` - Converts text to speech
- **Output:** MP3 file at `/tmp/output.mp3`

### VS Code Extension (extension.ts)
- **Type:** Chat Participant
- **Command:** `@speak-edge`
- **Integration:** GitHub Copilot Chat
- **Transport:** Spawns Docker container on-demand
- **MCP Client:** Uses `@modelcontextprotocol/sdk`

## Configuration

**VS Code settings.json:**
```json
{
  "mcp.servers": {
    "edge-tts": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "edge-tts-mcp"],
      "transport": "stdio"
    }
  }
}
```

## Available Voices

Default: `en-US-AriaNeural`

To list all available voices:
```bash
docker run --rm edge-tts-mcp python -c "
import edge_tts
import asyncio
async def list_voices():
    voices = await edge_tts.list_voices()
    for v in voices[:20]:
        print(f\"{v['ShortName']}: {v['Locale']} - {v['Gender']}\")
asyncio.run(list_voices())
"
```

## Troubleshooting

### Extension not appearing
- Reload VS Code window
- Check if extension is activated (Help → Developer Tools → Console)

### MCP connection fails
- Verify Docker is running: `docker ps`
- Test MCP server: `docker run --rm -i edge-tts-mcp`
- Rebuild image: `cd edge-tts-mcp && docker build -t edge-tts-mcp .`

### No audio output
- The audio file is saved in the container at `/tmp/output.mp3`
- To access it, mount a volume or copy it out

## Future Enhancements

1. **Voice Selection:** Add UI to choose different voices
2. **Audio Playback:** Play audio directly in VS Code
3. **File Export:** Save audio to local filesystem
4. **Batch Processing:** Convert multiple text entries
5. **Language Detection:** Auto-select voice based on language

---

**Status:** ✅ Ready to use!

Press **F5** to launch and try: `@speak-edge Hello from Copilot!`
