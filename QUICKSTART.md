# Quick Start Guide - Copilot Speak Edge

This guide will help you set up and use the `/speak-edge` command in GitHub Copilot Chat.

## Prerequisites

- Docker Desktop installed and running
- VS Code with GitHub Copilot extension
- Git Bash (Windows) or standard bash

## Step 1: Build the Edge TTS MCP Server

```bash
cd /d/development/edge-docker
./edge-tts-mcp-docker-setup.sh
```

This will:
- Create the necessary files for the MCP server
- Build a Docker image with Edge TTS
- Configure VS Code settings (if needed)

## Step 2: Start the HTTP Service (Recommended)

The HTTP service provides the easiest integration with GitHub Copilot:

```bash
cd /d/development/edge-docker
PORT=3006 node service/edge-tts-service.js
```

This starts the service on **http://localhost:3006** with:
- Text-to-speech generation and playback
- MP3 file playback ⭐ NEW
- Debug output mode

**For persistent service**, create a Docker container:
```bash
# See service/edge-tts-service.js for container setup
```

## Step 3: Install the Copilot Extension (Optional)

```bash
cd copilot-speak-extension
npm install
npm run compile
```

## Step 3: Run the Extension

Option A - Development Mode:
1. Open the `edge-docker` folder in VS Code
2. Press **F5** to launch Extension Development Host
3. A new VS Code window will open with the extension loaded

Option B - Manual Install:
1. Package the extension: `npx @vscode/vsce package`
2. Install the .vsix file: Extensions → ⋯ → Install from VSIX

## Step 4: Use with GitHub Copilot

### Option A: HTTP Service (Recommended)

In GitHub Copilot Chat:

```
@workspace /speak Hello world! This is my first text-to-speech message.
@workspace /play-mp3 C:/temp/edge-tts-1234567890.mp3
@workspace /speak-debug-output Testing audio generation
```

The service will:
1. Convert text to speech using Edge TTS in Docker
2. Play audio through Windows speakers
3. Automatically delete temp files
4. Report status and file information

### Option B: VS Code Extension

In the Extension Development Host window:

```
@speak-edge Hello world! This is my first text-to-speech message.
```

The extension will:
1. Connect to the MCP server in Docker
2. Convert your text to speech
3. Display the result and file location

## Verification

Test that everything works:

```bash
# Verify Docker image exists
docker images | grep edge-tts-mcp

# Test MCP server manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | docker run --rm -i edge-tts-mcp
```

You should see a JSON response from the MCP server.

## Troubleshooting

### Extension doesn't appear in Copilot Chat
- Make sure you launched via F5 or installed the .vsix
- Reload the window (Ctrl+Shift+P → Reload Window)

### "Docker not found" error
- Ensure Docker Desktop is running
- Test: `docker --version`

### MCP connection fails
- Rebuild the Docker image: `cd edge-tts-mcp && docker build -t edge-tts-mcp .`
- Check container logs if running

## What's Next?

- Customize voices by editing `src/extension.ts`
- Add more MCP tools to the server
- Package and share the extension

Enjoy your voice-enabled Copilot! ���
