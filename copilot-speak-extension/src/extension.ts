import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ChildProcess, spawn } from 'child_process';
import { Readable, Writable } from 'stream';

interface ISpeakEdgeChatResult extends vscode.ChatResult {
    metadata: {
        command: string;
    }
}

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

export function activate(context: vscode.ExtensionContext) {
    const handler: vscode.ChatRequestHandler = async (
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<ISpeakEdgeChatResult> => {
        if (request.command === 'speak') {
            try {
                // Get the text to speak from the prompt
                const textToSpeak = request.prompt.trim();

                if (!textToSpeak) {
                    stream.markdown('Please provide text to convert to speech.\n\nExample: `/speak-edge Hello, this is a test`');
                    return { metadata: { command: 'speak' } };
                }

                stream.progress('Connecting to Edge TTS MCP server...');

                // Create MCP client
                const mcpClient = new Client({
                    name: 'copilot-speak-edge',
                    version: '1.0.0'
                }, {
                    capabilities: {}
                });

                // Start Docker container with MCP server
                const dockerProcess = spawn('docker', ['run', '--rm', '-i', 'edge-tts-mcp'], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                const transport = new StdioClientTransport({
                    command: 'docker',
                    args: ['run', '--rm', '-i', 'edge-tts-mcp']
                });

                await mcpClient.connect(transport);

                stream.progress('Converting text to speech...');

                // Call the speak tool
                const result = await mcpClient.callTool({
                    name: 'speak',
                    arguments: {
                        text: textToSpeak,
                        voice: 'en-US-AriaNeural'
                    }
                }) as { content?: Array<{ type: string; text?: string }> };

                // Display result
                if (result.content && result.content.length > 0) {
                    const content = result.content[0];
                    if (content.type === 'text' && content.text) {
                        stream.markdown(`✅ **Text-to-Speech Complete**\n\n${content.text}\n\n📝 **Text:** "${textToSpeak}"\n\n🎤 **Voice:** en-US-AriaNeural`);
                    }
                }

                // Cleanup
                await mcpClient.close();

                return { metadata: { command: 'speak' } };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                stream.markdown(`❌ **Error:** ${errorMessage}\n\nMake sure the edge-tts-mcp Docker image is built and Docker is running.`);
                return { metadata: { command: 'speak' } };
            }
        }

        stream.markdown('Unknown command. Use `/speak-edge <text>` to convert text to speech.');
        return { metadata: { command: '' } };
    };

    const participant = vscode.chat.createChatParticipant('copilot-speak-edge.speak', handler);
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');

    context.subscriptions.push(participant);
}

export function deactivate() {}
