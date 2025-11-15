# Copilot Commands

This directory contains custom commands that Copilot can invoke during agent workflows.

## Available Commands

### `/speak` - Text-to-Speech Vocalization

Invokes the Windows TTS service to speak messages aloud.

**Prerequisites:**
- Windows vocalization service must be running: `cd tryout-vocalize-framework && npm start`

**Usage in Copilot:**

```
@workspace /speak Task completed successfully
@workspace /speak Build finished with no errors
@workspace /speak All tests are passing
```

**Command-Line Usage:**

```bash
# Using Node.js directly
cd .github/commands
node speak-command.mjs "Hello from Copilot"

# Using npm script
npm run speak "Build completed"

# Using batch file (Windows)
speak.bat "Docker containers are running"
```

**Architecture:**

```
Copilot Agent → speak-command.mjs → HTTP POST → Windows Service (localhost:3000) → TTS
```

## Implementation Files

- `speak.md` - Command documentation
- `speak-command.mjs` - Node.js implementation
- `speak.bat` - Windows batch wrapper
- `package.json` - NPM configuration

## Testing

Test the speak command:

```bash
# 1. Start Windows service (separate terminal)
cd tryout-vocalize-framework
npm start

# 2. Test the command
cd .github/commands
node speak-command.mjs "Testing Copilot speak command"
```

Expected output:
```
🔊 Speaking: "Testing Copilot speak command"
📡 Service: http://localhost:3000
✅ Success: Speech completed
   Length: 30 characters
   Time: 2025-11-14T12:34:56.789Z
```

## Adding New Commands

To add a new Copilot command:

1. Create `<command>.md` with documentation
2. Create `<command>-command.mjs` with implementation
3. (Optional) Create `<command>.bat` for Windows CLI
4. Update this README
5. Test the command thoroughly

## Environment Variables

- `WINDOWS_SERVICE_URL` - Override default service URL (default: `http://localhost:3000`)

Example:
```bash
WINDOWS_SERVICE_URL=http://localhost:4000 node speak-command.mjs "Hello"
```
