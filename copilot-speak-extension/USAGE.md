# Using the Copilot Speak Edge Extension

## Installation

1. Make sure you have the `edge-tts-mcp` Docker image built:
   ```bash
   cd /d/development/edge-docker
   ./edge-tts-mcp-docker-setup.sh
   ```

2. Install the extension in development mode:
   - Open VS Code
   - Press F5 to launch the Extension Development Host
   - Or manually install: Copy the `copilot-speak-extension` folder to your VS Code extensions directory

## Usage

In GitHub Copilot Chat, you can now use the `/speak-edge` participant:

### Basic Usage
```
@speak-edge Hello, this is a test of text to speech!
```

### The extension will:
1. Connect to the Edge TTS MCP server running in Docker
2. Convert your text to speech using Microsoft Edge TTS
3. Save the audio file and display the result

## Examples

```
@speak-edge Welcome to the voice-enabled world!
```

```
@speak-edge This is an example of converting text to speech using Microsoft Edge TTS technology.
```

## Troubleshooting

If the command doesn't work:

1. Make sure Docker Desktop is running
2. Verify the `edge-tts-mcp` image exists:
   ```bash
   docker images | grep edge-tts-mcp
   ```
3. Test the MCP server manually:
   ```bash
   docker run --rm -i edge-tts-mcp
   ```
4. Check the VS Code Developer Console for errors (Help → Toggle Developer Tools)

## Development

To modify the extension:

1. Edit files in `src/extension.ts`
2. Run `npm run compile` to rebuild
3. Reload the Extension Development Host window
