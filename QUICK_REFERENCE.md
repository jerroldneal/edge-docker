# Edge TTS MCP Server - Quick Reference

## Setup Complete! ✅

Your standalone MCP server is ready to use with VS Code or any MCP client.

## VS Code Configuration

Add this to your `settings.json` (File → Preferences → Settings → Open Settings (JSON)):

```json
{
  "mcp.servers": {
    "edge-tts": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "edge-tts-mcp"],
      "description": "Edge TTS - Text-to-Speech conversion"
    }
  }
}
```

**Settings location:** `%APPDATA%\Code\User\settings.json` (Windows)

## HTTP Service (Copilot Integration)

### Running the Service

```bash
PORT=3006 node service/edge-tts-service.js
```

Service runs on **http://localhost:3006**

### Copilot Commands

#### `/speak` - Text-to-Speech with Playback
```javascript
const tempFile = 'C:/temp/copilot-speak-' + Date.now() + '.txt';
await create_file(tempFile, 'Your message here');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + tempFile], 'speak');
```

#### `/play-mp3` - Play Existing MP3 Files ⭐ NEW
```javascript
// Play from host
await fetch_webpage(['http://localhost:3006/play-mp3?filePath=C:/temp/audio.mp3'], 'play-mp3');

// Play from container
await fetch_webpage(['http://localhost:3006/play-mp3?filePath=/tmp/output.mp3'], 'play-mp3');
```

**Features:**
- ✅ Play MP3 from Windows filesystem
- ✅ Play MP3 from Docker container (auto-copied)
- ✅ Full duration playback
- ✅ File size reporting

#### `/speak-debug-output` - Save MP3 to C:/temp
```javascript
const tempFile = 'C:/temp/copilot-speak-debug-' + Date.now() + '.txt';
await create_file(tempFile, 'Your message here');
await fetch_webpage(['http://localhost:3006/speak-debug-output?filePath=' + tempFile], 'speak-debug');
```

Audio file copied to: `C:/temp/edge-tts-{timestamp}.mp3`

## Available MCP Tools

### 1. **speak** - Convert text to speech

```json
{
  "name": "speak",
  "arguments": {
    "text": "Your text here",
    "voice": "en-US-AriaNeural",
    "output_file": "/tmp/output.mp3"
  }
}
```

**Parameters:**
- `text` (required) - Text to convert
- `voice` (optional) - Voice name, default: "en-US-AriaNeural"
- `output_file` (optional) - Output path, default: "/tmp/output.mp3"

### 2. **list_voices** - List available voices

```json
{
  "name": "list_voices",
  "arguments": {
    "language": "en-US"
  }
}
```

**Parameters:**
- `language` (optional) - Filter by language code (e.g., "en-US", "es-ES")

## Popular Voices

**English:**
- `en-US-AriaNeural` - Female (US)
- `en-US-GuyNeural` - Male (US)
- `en-GB-RyanNeural` - Male (UK)
- `en-GB-SoniaNeural` - Female (UK)

**Other Languages:**
- `es-ES-ElviraNeural` - Spanish (Spain)
- `fr-FR-DeniseNeural` - French
- `de-DE-KatjaNeural` - German
- `ja-JP-NanamiNeural` - Japanese

## Manual Testing

### Test server is running:
```bash
docker run --rm -i edge-tts-mcp
```

Then paste this JSON and press Enter:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
```

### Test tools list:
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

### Test speak tool:
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"speak","arguments":{"text":"Hello world"}}}
```

## Using with VS Code Extensions

Any VS Code extension that supports MCP can use this server:

1. **GitHub Copilot with MCP support** - Use in chat
2. **Custom MCP client extensions** - Will auto-discover the server
3. **Your own extension** - Reference "edge-tts" server by name

## Troubleshooting

**Server not found:**
```bash
# Verify Docker image exists
docker images | grep edge-tts-mcp

# Rebuild if needed
cd edge-tts-mcp
docker build -t edge-tts-mcp .
```

**VS Code not recognizing server:**
- Check settings.json is valid JSON
- Reload VS Code (Ctrl+Shift+P → "Reload Window")
- Ensure MCP-compatible extension is installed

**Audio file not accessible:**
- Files are saved inside Docker container
- To access: mount a volume with `-v /your/path:/tmp`

## Next Steps

1. ✅ Server is built and tested
2. 📝 Add configuration to VS Code settings.json
3. 🔄 Reload VS Code window
4. 🎤 Use from any MCP-compatible extension

---

**Note:** This is a standalone MCP server. No Claude Desktop required!
