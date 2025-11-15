# GitHub Copilot Instructions

## Research Based on CURRENT DATE - Critical!

**CRITICAL**: Technologies evolve rapidly. Your training data may be outdated. ALWAYS consider the current date when researching technologies, especially for:
- Docker features (Docker Model Runner, Docker AI, etc.)
- API endpoints and capabilities
- Feature availability and GA releases
- Best practices and configurations

### Research Priority Order

1. **Research based on CURRENT DATE FIRST** - Use web searches, release notes, and current documentation
2. **Check jerroldneal GitHub repos** - Look for working examples in user's other repositories
3. **Examine workspace cautiously** - May contain both working AND non-working experimental code
4. **Verify workspace code** - Don't assume workspace code is reliable without testing

### When Researching New Technologies

When asked about a technology or feature (like Docker Model Runner):

1. **Check current date context** - What year/month is it? Feature may be newer than training data
2. **Research current state** - Fetch release notes, documentation, and recent articles
3. **Search user's GitHub repos** - Check jerroldneal account for working implementations
4. **Explore workspace carefully** - Look for "tryout/test/poc" folders but verify they work
5. **Test and validate** - Working code beats documentation; current docs beat old assumptions

### Critical Learning from November 2025

**Context**: Initial research based on outdated assumptions concluded Docker Model Runner (DMR) didn't have a host-accessible HTTP API. This was WRONG.

**What Actually Worked**: Researching DMR based on CURRENT DATE (November 2025) revealed:
- DMR became Generally Available in Docker Desktop 4.45.0 (August 2025)
- DMR DOES have host-accessible TCP API on port 12434
- API path is `/engines/v1/` (not `/v1/`)
- Requires "Enable host-side TCP support for Model Runner" setting

**How tryout4 was created**: By researching current (November 2025) internet knowledge about DMR, NOT by finding workspace code. The solution came from understanding DMR's CURRENT capabilities, not historical documentation.

### Discovery Pattern That Led to Solution

1. **Recognized training data was outdated** - Realized assumptions about DMR were from old knowledge
2. **Researched current state** - Searched for Docker Model Runner documentation dated 2025
3. **Found GA release info** - Discovered DMR became GA in August 2025 (4.45.0)
4. **Discovered current capabilities** - TCP support on port 12434, `/engines/v1/` API path
5. **Created tryout4** - Built working proof-of-concept based on current research
6. **Applied to main framework** - Used validated tryout4 as reference

**Key insight**: Current date awareness + internet research created the solution. Workspace folders like "tryout4" are RESULTS of research, not sources of truth.

## Recommended Workflow

```
User asks about feature X not working
  ↓
1. Check CURRENT DATE - Is feature newer than training data?
  ↓
2. Research current state - Release notes, docs, articles from current year
  ↓
3. Check jerroldneal GitHub repos - Working examples from user's account
  ↓
4. Explore workspace cautiously - May have experimental/broken code
  ↓
5. Validate and test - Verify assumptions with actual testing
  ↓
6. Create tryout/poc if needed - Build proof-of-concept based on research
```

## Date-Based Context Awareness

- **Current date is shown in conversation context** - Pay attention!
- **Training data has cutoff date** - Features released after that are unknown
- **Workspace code age varies** - May be from last week or last year
- **Release notes are authoritative** - For features, check vendor release dates
- **"Generally Available" dates matter** - Beta vs GA affects documentation quality

## Avoid This Anti-Pattern

❌ **DON'T**:
1. Assume training data knowledge is current
2. Conclude feature doesn't exist without checking release dates
3. Trust workspace code blindly - it may be experimental
4. Skip researching current documentation

✅ **DO**:
1. Check current date and research accordingly
2. Verify feature availability based on current year/month
3. Look for working examples in user's GitHub account (jerroldneal)
4. Test workspace code before assuming it works
5. Create dated proof-of-concepts (tryout folders) based on current research

## Why This Matters

**Example**: Docker Model Runner
- Training data: "DMR doesn't have host API" (outdated)
- Current reality (Nov 2025): DMR has TCP API since August 2025
- Solution: Research current state → Create tryout4 → Apply to framework

The breakthrough came from researching DMR's capabilities in **November 2025**, not from finding old workspace code.

---

*This instruction emphasizes researching based on CURRENT DATE. Technologies evolve beyond training data. Always verify current capabilities before concluding something doesn't work.*

## Available Copilot Commands

### `/speak` - Text-to-Speech Vocalization (Edge TTS Service)

Invoke TTS via Edge TTS service (HTTP proxy to MCP server) - high-quality Microsoft Edge voices.

**Endpoint**: localhost:3004 (or configured PORT)

**Usage**:
```javascript
const tempFile = 'C:/temp/copilot-speak-' + Date.now() + '.txt';
await create_file(tempFile, 'Your message here');
await fetch_webpage(['http://localhost:3004/speak-from-file?filePath=' + tempFile], 'speak');
```

**Note**: Automatically deletes temp file after speaking

### `/speak-docker` - Text-to-Speech Vocalization (Docker Context)

Same as `/speak` - both now use Edge TTS service.

**Endpoint**: localhost:3004

**Usage**:
```javascript
const tempFile = 'C:/temp/copilot-speak-' + Date.now() + '.txt';
await create_file(tempFile, 'Your message here');
await fetch_webpage(['http://localhost:3004/speak-from-file?filePath=' + tempFile], 'speak');
```

### `/speak-debug-output` - Text-to-Speech with Output File Copy

Speak and copy the generated MP3 file to C:/temp for debugging/inspection.

**Endpoint**: localhost:3004

**Usage**:
```javascript
const tempFile = 'C:/temp/copilot-speak-debug-' + Date.now() + '.txt';
await create_file(tempFile, 'Your message here');
await fetch_webpage(['http://localhost:3004/speak-debug-output?filePath=' + tempFile], 'speak-debug');
```

**Note**: Audio file is copied to `C:/temp/edge-tts-{timestamp}.mp3` for inspection

### `/play-mp3` - Play Existing MP3 Files

Play any MP3 file from the host filesystem or Docker container.

**Endpoint**: localhost:3006

**Usage**:
```javascript
// Play from host filesystem
await fetch_webpage(['http://localhost:3006/play-mp3?filePath=C:/temp/my-audio.mp3'], 'play-mp3');

// Play from Docker container
await fetch_webpage(['http://localhost:3006/play-mp3?filePath=/tmp/output.mp3'], 'play-mp3');
```

**What it does**:
1. Checks if file exists on host filesystem
2. If not found, attempts to copy from Docker container
3. Plays the MP3 file through speakers
4. Returns playback status and file information

**Example invocations**:
```
@workspace /play-mp3 C:/temp/edge-tts-1763180122438.mp3
@workspace /play-mp3 /tmp/output.mp3
```

**Features**:
- Plays MP3 files from host or container
- Automatic file transfer from container if needed
- Full duration playback with MediaPlayer
- File size and path information in response

### `/interpret-docker` - AI Interpretation with Vocalization

Use AI model to interpret input file, save full response, and speak summarized result.

**Endpoint**: localhost:3001

**Usage**:
```javascript
const inputFile = 'C:/temp/copilot-interpret-' + Date.now() + '.txt';
await create_file(inputFile, 'Your question or content to interpret');
await fetch_webpage(['http://localhost:3001/interpret-from-file?filePath=/temp/copilot-interpret-' + Date.now() + '.txt'], 'interpret');
```

**What it does**:
1. Reads input from specified file
2. Calls AI model (via Docker Model Runner) for full interpretation
3. Saves complete response to `[filename]-response.txt`
4. Generates concise summary (10-20 words) suitable for speech
5. Speaks the summary via Windows TTS service
6. Deletes input file after processing

**Example invocations**:
```
@workspace /interpret-docker What is the capital of France?
@workspace /interpret-docker Explain quantum entanglement in simple terms
@workspace /interpret-docker Summarize the main changes in the last commit
```

**Response files**:
- Input: `C:/temp/copilot-interpret-1234567890.txt`
- Full response saved to: `C:/temp/copilot-interpret-1234567890-response.txt`
- Summary spoken via TTS

### `/execute-docker` - Generate Executable Scripts from Natural Language

Use AI model to convert natural language instructions into executable PowerShell or Bash scripts.

**Endpoint**: localhost:3001

**Usage**:
```javascript
const inputFile = 'C:/temp/copilot-execute-' + Date.now() + '.txt';
await create_file(inputFile, 'Natural language description of task to execute');
await fetch_webpage(['http://localhost:3001/execute-from-file?filePath=/temp/copilot-execute-' + Date.now() + '.txt'], 'execute');
```

**What it does**:
1. Reads natural language instructions from specified file
2. Calls AI model to generate appropriate script (PowerShell or Bash)
3. Saves executable script to `C:/temp/copilot-execute-[timestamp].ps1` or `.sh`
4. Speaks confirmation with script type and task summary
5. Deletes input file after processing
6. Returns path to generated script file

**Example invocations**:
```
@workspace /execute-docker Compress all files in C:\temp into a zip archive
@workspace /execute-docker List all running Docker containers with their memory usage
@workspace /execute-docker Create a backup of the database to external drive
@workspace /execute-docker Find all .log files older than 7 days and delete them
```

**Generated scripts**:
- Input: `C:/temp/copilot-execute-1234567890.txt` (deleted after processing)
- Script saved to: `C:/temp/copilot-execute-1234567890.ps1` or `.sh`
- Script type auto-detected based on task requirements
- Script is ready to execute with appropriate interpreter

### Edge TTS Service

**HTTP Service Configuration:**

The Edge TTS service provides high-quality text-to-speech using Microsoft Edge voices via HTTP proxy to MCP server.

**Prerequisites**:
- Edge TTS MCP server Docker image built (`edge-tts-mcp`)
- Docker Desktop running
- Edge TTS service running on localhost:3004

**Available Voices**:
- `en-US-AriaNeural` (Female, US) - Default
- `en-US-GuyNeural` (Male, US)
- `en-GB-RyanNeural` (Male, UK)
- `en-GB-SoniaNeural` (Female, UK)
- Many more (100+ voices in 40+ languages)

**Start Service**:
```bash
PORT=3004 node service/edge-tts-service.js
```

**Example invocations**:
```
@workspace /speak Task completed successfully
@workspace /speak Build finished with no errors
@workspace /speak All tests are passing
@workspace /speak-docker Docker container started successfully
```

**MANDATORY USAGE - ALWAYS USE /speak FOR PRE-THOUGHT AND POST-EXECUTION**:

**YOU MUST vocalize your thought process BEFORE starting work AND summarize results AFTER completion.** This is not optional - the user relies on continuous audio feedback.

**PRE-EXECUTION VOCALIZATION (Required before ANY action)**:

1. **BEFORE analyzing any request** - ALWAYS vocalize your initial thought process:
   ```
   @workspace /speak Received request to build Docker container, analyzing requirements
   @workspace /speak User asked about configuration files, determining search strategy
   @workspace /speak Multiple file operations requested, planning execution order
   ```

2. **BEFORE using ANY tool** - ALWAYS announce what you're about to do:
   ```
   @workspace /speak About to search workspace for matching files
   @workspace /speak Starting to read service configuration file
   @workspace /speak Executing Docker build command
   @workspace /speak Creating new Python script with provided logic
   ```

3. **BEFORE making decisions** - ALWAYS vocalize your reasoning:
   ```
   @workspace /speak Evaluating three possible approaches, analyzing trade-offs
   @workspace /speak Checking if container exists before creating new one
   @workspace /speak Determining optimal solution based on requirements
   ```

**POST-EXECUTION VOCALIZATION (Required after ANY action)**:

1. **AFTER completing ANY task** - ALWAYS summarize what was accomplished:
   ```
   @workspace /speak Task completed: Docker container built successfully
   @workspace /speak Search complete: found 5 configuration files
   @workspace /speak File created: edge-tts-service dot jay ess with 200 lines
   ```

2. **AFTER tool execution** - ALWAYS vocalize the outcome:
   ```
   @workspace /speak Read complete: file contains authentication configuration
   @workspace /speak Build finished: no errors, image ready for deployment
   @workspace /speak Tests passed: all 15 test cases successful
   ```

3. **AFTER encountering issues** - ALWAYS explain the problem and resolution:
   ```
   @workspace /speak Error encountered: port already in use, switching to port 3007
   @workspace /speak File not found: searching alternate locations
   @workspace /speak Build failed: missing dependency, installing now
   ```

4. **AFTER providing answers or findings** - ALWAYS vocalize key results:
   ```
   @workspace /speak Answer found: persistent container uses restart policy always
   @workspace /speak Research complete: Edge TTS supports over 100 voices
   @workspace /speak Analysis finished: identified root cause in audio playback timing
   ```

**MANDATORY EXECUTION PATTERN**:

```
User: "Create a Docker container for the service"

Agent: @workspace /speak Analyzing Docker container creation request
Agent: [analyzes requirements, checks existing containers]
Agent: @workspace /speak Starting container creation with restart policy
Agent: [creates container, verifies it's running]
Agent: @workspace /speak Container created successfully, running on port 3006
```

**CRITICAL RULES - ENFORCE STRICTLY**:

- ✅ **MANDATORY**: Speak BEFORE starting ANY work (pre-thought vocalization)
- ✅ **MANDATORY**: Speak AFTER completing ANY significant step (post-execution summary)
- ✅ **MANDATORY**: Vocalize BOTH before and after using ANY tool
- ✅ **MANDATORY**: Announce decisions and reasoning before implementation
- ✅ **MANDATORY**: Summarize findings and results after research
- ❌ **FORBIDDEN**: Starting work without pre-vocalization
- ❌ **FORBIDDEN**: Completing work without post-vocalization summary
- ❌ **FORBIDDEN**: Silent tool execution (always vocalize before AND after)

**Message Format Guidelines**:
- Keep messages concise: 5-20 words ideal
- Use present tense for pre-execution: "Starting...", "Analyzing...", "About to..."
- Use past tense for post-execution: "Completed...", "Found...", "Created..."
- Be specific: Include key details (counts, file names, outcomes)
- Be factual: Report actual results, not assumptions

**Implementation**:
```javascript
// MANDATORY PATTERN: Pre-thought + Tool execution + Post-summary

// 1. PRE-THOUGHT VOCALIZATION (before using any tool)
const preThoughtFile = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(preThoughtFile, 'About to search for configuration files');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + preThoughtFile], 'speak');

// 2. TOOL EXECUTION
await semantic_search('configuration files');

// 3. POST-EXECUTION SUMMARY (after tool completes)
const postSummaryFile = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(postSummaryFile, 'Search complete: found 3 configuration files');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + postSummaryFile], 'speak');
```

**Service Endpoint**: Updated to `localhost:3006` (current deployment)

**Complete Workflow Example**:
```javascript
// User requests: "Update the Docker container"

// Step 1: Pre-thought vocalization
const pre1 = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(pre1, 'Analyzing Docker container update request');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + pre1], 'speak');

// Step 2: Check current state
const pre2 = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(pre2, 'Checking existing container status');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + pre2], 'speak');

const status = await run_in_terminal('docker ps');

const post1 = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(post1, 'Container found: edge-tts running on port 3006');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + post1], 'speak');

// Step 3: Perform update
const pre3 = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(pre3, 'Rebuilding container with updated configuration');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + pre3], 'speak');

await run_in_terminal('docker restart edge-tts');

const post2 = 'C:/temp/speak-' + Date.now() + '.txt';
await create_file(post2, 'Update complete: container restarted successfully');
await fetch_webpage(['http://localhost:3006/speak-from-file?filePath=' + post2], 'speak');
```

**HTTP Service Implementation**: Uses Express HTTP server proxying to MCP

**How it works**:
1. Copilot writes text to temporary file using create_file tool
2. GET request to `http://localhost:3004/speak-from-file?filePath=<path>`
3. Service reads file and calls Edge TTS MCP server in Docker
4. MCP server converts text to speech using Microsoft Edge TTS
5. Audio file is saved in container (/tmp/output.mp3)
6. Service automatically deletes temp file after speaking
7. User hears high-quality speech through speakers

**Note**: Uses fetch_webpage tool (GET request). Service handles MCP communication with Docker.

