# Copilot Speak Edge

A VS Code extension that adds a `/speak-edge` command to GitHub Copilot Chat to convert text to speech using Microsoft Edge TTS via MCP (Model Context Protocol).

## Features

- Convert text to speech using Microsoft Edge TTS
- Integrates with GitHub Copilot Chat as a participant
- Uses MCP protocol to communicate with dockerized Edge TTS server

## Usage

In GitHub Copilot Chat, use the `/speak-edge` command:

```
@speak-edge Hello, this is a test of text to speech!
```

## Requirements

- Docker Desktop installed and running
- The `edge-tts-mcp` Docker image built (run the setup script first)
- GitHub Copilot extension

## Installation

1. Build the Edge TTS MCP Docker image:
   ```bash
   ./edge-tts-mcp-docker-setup.sh
   ```

2. Install dependencies:
   ```bash
   cd copilot-speak-extension
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Press F5 in VS Code to run the extension in debug mode

## Commands

- `/speak-edge <text>` - Convert text to speech using Edge TTS
