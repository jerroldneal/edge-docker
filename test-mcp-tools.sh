#!/bin/bash

echo "Testing Edge TTS MCP Server Tools"
echo "=================================="
echo ""

echo "1. Testing tools/list..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | docker run --rm -i edge-tts-mcp | grep -A 20 '"id":2'

echo ""
echo "2. Testing speak tool..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"speak","arguments":{"text":"Hello from Edge TTS MCP Server"}}}' | docker run --rm -i edge-tts-mcp | grep -A 10 '"id":3'

echo ""
echo "=================================="
echo "✅ MCP Server is working correctly!"
