# Edge TTS MCP Architecture

## System Overview

This document provides detailed architecture diagrams and configuration explanations for the Edge TTS Model Context Protocol (MCP) system integrated with GitHub Copilot.

## High-Level Architecture

```mermaid
graph TB
    subgraph "GitHub Copilot (VS Code Extension)"
        CP[Copilot Agent]
        CI[Copilot Instructions<br/>.github/copilot-instructions.md]
    end

    subgraph "Host Machine (Windows)"
        subgraph "Node.js Service (Port 3006)"
            HTTP[HTTP Express Server<br/>edge-tts-service.js]
            AudioPlayer[Windows MediaPlayer<br/>PowerShell Integration]
        end

        FS[File System<br/>C:/temp/*.mp3]
        TempFiles[Temp Files<br/>C:/temp/copilot-speak-*.txt]
    end

    subgraph "Docker Environment"
        subgraph "Persistent Container: edge-tts"
            MCP[MCP Server<br/>server.py]
            EdgeTTS[Edge TTS Library<br/>Python edge-tts]
            MP3[Generated MP3<br/>/tmp/output.mp3]
        end
    end

    CP -->|1. Creates temp file| TempFiles
    CP -->|2. HTTP GET request| HTTP
    HTTP -->|3. Reads file content| TempFiles
    HTTP -->|4. docker exec -i| MCP
    MCP -->|5. Generates audio| EdgeTTS
    EdgeTTS -->|6. Saves MP3| MP3
    HTTP -->|7. docker cp| MP3
    MP3 -->|8. Copied to host| FS
    HTTP -->|9. Plays audio| AudioPlayer
    AudioPlayer -->|10. Speakers| User((User))
    HTTP -->|11. HTTP Response| CP
    CI -.->|Configures behavior| CP

    style CP fill:#e1f5ff
    style HTTP fill:#fff4e1
    style MCP fill:#e8f5e9
    style EdgeTTS fill:#f3e5f5
    style User fill:#ffebee
```

## Detailed Component Architecture

```mermaid
graph TB
    subgraph "Copilot Integration Layer"
        direction TB
        CopilotAgent[GitHub Copilot Agent]
        Instructions[Copilot Instructions<br/>Mandatory Vocalization Rules]

        CopilotAgent -->|Reads| Instructions
    end

    subgraph "HTTP Service Layer (edge-tts-service.js)"
        direction TB

        subgraph "Express Endpoints"
            SpeakEndpoint[GET /speak-from-file]
            HealthEndpoint[GET /health]
            StatsEndpoint[GET /stats]
        end

        subgraph "Core Functions"
            CheckContainer[ensureContainer<br/>Verify edge-tts running]
            CallMCP[callEdgeTts<br/>MCP JSON-RPC client]
            CopyFile[docker cp<br/>Container to host]
            PlayAudio[playAudio<br/>PowerShell MediaPlayer]
        end

        SpeakEndpoint --> CheckContainer
        CheckContainer --> CallMCP
        CallMCP --> CopyFile
        CopyFile --> PlayAudio
    end

    subgraph "Docker MCP Layer"
        direction TB

        subgraph "Persistent Container Configuration"
            ContainerName[Container: edge-tts]
            RestartPolicy[--restart always]
            StdinOpen[-i interactive]
        end

        subgraph "MCP Server (server.py)"
            MCPInit[initialize method<br/>Protocol version 2024-11-05]
            MCPTools[tools/call method<br/>speak, list_voices]
            MCPSpeak[speak tool<br/>text, voice, output_file]
        end

        subgraph "Edge TTS Engine"
            Communicate[edge_tts.Communicate]
            VoiceEngine[Microsoft Edge TTS<br/>100+ voices, 40+ languages]
            AudioGen[MP3 Generation<br/>/tmp/output.mp3]
        end

        ContainerName --> MCPInit
        RestartPolicy --> ContainerName
        StdinOpen --> ContainerName
        MCPInit --> MCPTools
        MCPTools --> MCPSpeak
        MCPSpeak --> Communicate
        Communicate --> VoiceEngine
        VoiceEngine --> AudioGen
    end

    CopilotAgent -->|fetch_webpage| SpeakEndpoint
    PlayAudio -->|Audio Output| Speakers((Speakers))

    style CopilotAgent fill:#4285f4,color:#fff
    style SpeakEndpoint fill:#fbbc04
    style MCPSpeak fill:#34a853
    style VoiceEngine fill:#ea4335,color:#fff
    style Speakers fill:#ff6d00,color:#fff
```

## Configuration Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Copilot
    participant Instructions as Copilot Instructions
    participant HTTP as Edge TTS Service
    participant Docker
    participant MCP as MCP Server
    participant EdgeTTS as Edge TTS Library
    participant Speakers

    Note over Instructions: Mandatory Pre-Thought Vocalization
    User->>Copilot: "Build the application"
    Copilot->>Instructions: Check vocalization rules
    Instructions-->>Copilot: MANDATORY: Speak before action

    Copilot->>Copilot: create_file("Analyzing build request")
    Copilot->>HTTP: GET /speak-from-file?filePath=...
    HTTP->>Docker: docker ps (check edge-tts)
    Docker-->>HTTP: Container running
    HTTP->>Docker: docker exec -i edge-tts python server.py
    Docker->>MCP: Start MCP session
    HTTP->>MCP: {"method":"initialize",...}
    MCP-->>HTTP: {"result":{"protocolVersion":"2024-11-05"}}
    HTTP->>MCP: {"method":"tools/call","params":{"name":"speak",...}}
    MCP->>EdgeTTS: Communicate(text, voice).save()
    EdgeTTS-->>MCP: MP3 generated at /tmp/output.mp3
    MCP-->>HTTP: {"result":{"content":[{"text":"Success"}]}}
    HTTP->>Docker: docker cp edge-tts:/tmp/output.mp3 C:/temp/...
    Docker-->>HTTP: File copied
    HTTP->>HTTP: playAudio() via PowerShell
    HTTP->>Speakers: MediaPlayer plays MP3
    Speakers-->>User: 🔊 "Analyzing build request"
    HTTP-->>Copilot: HTTP 200 {"success":true,...}

    Note over Copilot: Perform actual build work
    Copilot->>Copilot: [Execute build commands]

    Note over Instructions: Mandatory Post-Execution Vocalization
    Copilot->>Instructions: Check completion rules
    Instructions-->>Copilot: MANDATORY: Speak after completion
    Copilot->>Copilot: create_file("Build completed successfully")
    Copilot->>HTTP: GET /speak-from-file?filePath=...
    Note over HTTP,Speakers: [Same MCP flow as above]
    Speakers-->>User: 🔊 "Build completed successfully"
```

## MCP Protocol Communication

```mermaid
sequenceDiagram
    participant Service as edge-tts-service.js
    participant Container as Docker Container
    participant MCP as MCP Server (server.py)
    participant EdgeTTS as edge-tts Library

    Service->>Container: docker exec -i edge-tts python server.py
    Container->>MCP: Launch MCP server process

    rect rgb(230, 240, 255)
        Note over Service,MCP: Initialization Phase
        Service->>MCP: stdin: {"jsonrpc":"2.0","id":1,"method":"initialize",<br/>"params":{"protocolVersion":"2024-11-05",<br/>"capabilities":{},"clientInfo":{"name":"edge-tts-service"}}}
        MCP->>Service: stdout: {"jsonrpc":"2.0","id":1,<br/>"result":{"protocolVersion":"2024-11-05",<br/>"capabilities":{"tools":{}},...}}
    end

    rect rgb(255, 240, 230)
        Note over Service,EdgeTTS: Tool Call Phase
        Service->>MCP: stdin: {"jsonrpc":"2.0","id":2,"method":"tools/call",<br/>"params":{"name":"speak",<br/>"arguments":{"text":"Hello world",<br/>"voice":"en-US-AriaNeural",<br/>"output_file":"/tmp/output.mp3"}}}
        MCP->>EdgeTTS: asyncio.run(Communicate(text, voice).save(output_file))
        EdgeTTS->>EdgeTTS: Generate MP3 audio
        EdgeTTS-->>MCP: MP3 saved to /tmp/output.mp3
        MCP->>Service: stdout: {"jsonrpc":"2.0","id":2,<br/>"result":{"content":[{"type":"text",<br/>"text":"✅ Text-to-speech conversion successful..."}]}}
    end

    rect rgb(230, 255, 240)
        Note over Service,Container: File Extraction Phase
        Service->>Container: docker cp edge-tts:/tmp/output.mp3 C:/temp/edge-tts-{timestamp}.mp3
        Container-->>Service: File copied to host
    end

    Service->>Service: Kill MCP process (stdin.end())
```

## Copilot Instruction Configuration

```mermaid
graph TB
    subgraph "Copilot Instructions (.github/copilot-instructions.md)"
        direction TB

        subgraph "Vocalization Rules"
            PreThought[PRE-THOUGHT VOCALIZATION<br/>✅ Before analyzing requests<br/>✅ Before using tools<br/>✅ Before decisions]
            PostExec[POST-EXECUTION VOCALIZATION<br/>✅ After completing tasks<br/>✅ After tool execution<br/>✅ After findings]
            Forbidden[FORBIDDEN PATTERNS<br/>❌ Silent work start<br/>❌ No completion summary<br/>❌ Silent tool execution]
        end

        subgraph "Service Configuration"
            Endpoint[Service Endpoint<br/>localhost:3006]
            FilePattern[Temp File Pattern<br/>C:/temp/speak-{timestamp}.txt]
            HTTPCall[HTTP Method<br/>GET /speak-from-file]
        end

        subgraph "Implementation Pattern"
            Step1[1. Create temp file with message]
            Step2[2. Call fetch_webpage with file path]
            Step3[3. Service auto-deletes temp file]
            Step4[4. Audio plays through speakers]
        end

        PreThought --> Step1
        PostExec --> Step1
        Step1 --> Step2
        Step2 --> Step3
        Step3 --> Step4
        Endpoint -.-> HTTPCall
        FilePattern -.-> Step1
    end

    subgraph "Copilot Execution"
        Agent[Copilot Agent]
        Tools[Tool Invocations<br/>create_file, fetch_webpage]
    end

    PreThought -->|Enforces| Agent
    PostExec -->|Enforces| Agent
    Forbidden -->|Prevents| Agent
    Agent --> Tools

    style PreThought fill:#c8e6c9
    style PostExec fill:#c8e6c9
    style Forbidden fill:#ffcdd2
    style Agent fill:#bbdefb
```

## Docker Container Configuration

```mermaid
graph TB
    subgraph "Container Setup (setup-persistent-container.sh)"
        direction TB

        BuildImage[Build Image<br/>docker build -t edge-tts-mcp]

        subgraph "Container Creation"
            Name[--name edge-tts]
            Restart[--restart always<br/>Auto-start on Docker startup]
            Interactive[-i<br/>Keep stdin open for MCP]
            Detached[-d<br/>Run in background]
            Command[python server.py<br/>Launch MCP server]
        end

        BuildImage --> Name
        Name --> Restart
        Restart --> Interactive
        Interactive --> Detached
        Detached --> Command
    end

    subgraph "Runtime Behavior"
        direction TB

        DockerStart[Docker Daemon Starts]
        AutoStart[Container auto-starts<br/>--restart always]
        MCPReady[MCP Server Ready<br/>Listens on stdin]
        HandleRequests[Handles JSON-RPC requests<br/>via docker exec]

        DockerStart --> AutoStart
        AutoStart --> MCPReady
        MCPReady --> HandleRequests
    end

    Command -.->|Launches| MCPReady

    style Restart fill:#ffeb3b
    style Interactive fill:#4caf50,color:#fff
    style AutoStart fill:#ff9800,color:#fff
```

## File Flow Architecture

```mermaid
graph LR
    subgraph "Copilot Workspace"
        CP[Copilot Agent]
    end

    subgraph "Windows File System"
        TempIn[C:/temp/speak-timestamp.txt<br/>Input: Text to speak]
        TempOut[C:/temp/edge-tts-timestamp.mp3<br/>Output: Audio file]
    end

    subgraph "Docker Container"
        ContainerMP3[c:/tmp/output.mp3 Generated audio]
    end

    subgraph "Edge TTS Service"
        ReadFile[Read text from file]
        DeleteFile[Delete input file]
        PlayFile[Play MP3 via PowerShell]
    end

    CP -->|create_file| TempIn
    CP -->|fetch_webpage| ReadFile
    ReadFile -->|Reads| TempIn
    ReadFile -->|MCP call generates| ContainerMP3
    ContainerMP3 -->|docker cp| TempOut
    TempOut -->|Play| PlayFile
    PlayFile -->|Audio| Speakers((🔊))
    ReadFile -->|Cleanup| DeleteFile
    DeleteFile -->|Removes| TempIn

    style TempIn fill:#fff9c4
    style ContainerMP3 fill:#c5e1a5
    style TempOut fill:#b3e5fc
    style Speakers fill:#ff8a80,color:#fff
```

## Service Startup Flow

```mermaid
stateDiagram-v2
    [*] --> ServiceStart: PORT=3006 node edge-tts-service.js

    ServiceStart --> CheckContainer: ensureContainer()

    state CheckContainer {
        [*] --> ContainerCheck: docker ps
        ContainerCheck --> Exists: Container found
        ContainerCheck --> NotExists: Not found

        Exists --> Running: Status Up
        Exists --> Stopped: Status Exited

        Stopped --> StartContainer: docker start edge-tts
        StartContainer --> Ready

        NotExists --> CreateContainer: docker run -d --name edge-tts<br/>--restart always -i<br/>edge-tts-mcp python server.py
        CreateContainer --> Ready

        Running --> Ready
    }

    Ready --> TestMCP: Test MCP connection
    TestMCP --> SpeakTest: speak("Edge TTS service started")
    SpeakTest --> ListenRequests: HTTP server listening on 3006

    ListenRequests --> HandleRequest: Incoming request
    HandleRequest --> ListenRequests: Response sent

    style ServiceStart fill:#4285f4,color:#fff
    style Ready fill:#34a853,color:#fff
    style ListenRequests fill:#fbbc04
```

## Error Handling & Recovery

```mermaid
graph TB
    Request[Incoming /speak-from-file request]

    Request --> CheckFile{File exists?}
    CheckFile -->|No| Error404[404: File not found]
    CheckFile -->|Yes| ReadFile[Read file content]

    ReadFile --> CheckEmpty{Content empty?}
    CheckEmpty -->|Yes| Error400[400: Empty file]
    CheckEmpty -->|No| CheckContainer{Container running?}

    CheckContainer -->|No| StartContainer[Start/Create container]
    StartContainer --> ContainerFail{Start failed?}
    ContainerFail -->|Yes| Error500[500: Container unavailable]
    ContainerFail -->|No| CallMCP

    CheckContainer -->|Yes| CallMCP[Call MCP server]
    CallMCP --> MCPFail{MCP error?}
    MCPFail -->|Yes| Error500MCP[500: MCP call failed]
    MCPFail -->|No| CopyFile[docker cp to host]

    CopyFile --> CopyFail{Copy failed?}
    CopyFail -->|Yes| Error500Copy[500: File copy failed]
    CopyFail -->|No| PlayAudio[Play audio via PowerShell]

    PlayAudio --> PlayFail{Playback error?}
    PlayFail -->|Yes| LogWarning[Log warning, continue]
    PlayFail -->|No| Success

    LogWarning --> Success[200: Success with warning]
    Success --> Cleanup[Delete temp file]

    Error404 --> End
    Error400 --> End
    Error500 --> End
    Error500MCP --> End
    Error500Copy --> End
    Cleanup --> End[Return response]

    style Error404 fill:#f44336,color:#fff
    style Error400 fill:#f44336,color:#fff
    style Error500 fill:#f44336,color:#fff
    style Success fill:#4caf50,color:#fff
```

## Configuration Summary

### Copilot Configuration
- **Location**: `.github/copilot-instructions.md`
- **Service Endpoint**: `http://localhost:3006`
- **Temp File Pattern**: `C:/temp/speak-{timestamp}.txt`
- **Mandatory Behavior**:
  - Pre-thought vocalization before any action
  - Post-execution summary after completion
  - No silent operations permitted

### Docker MCP Server
- **Container Name**: `edge-tts`
- **Image**: `edge-tts-mcp`
- **Restart Policy**: `always` (auto-start with Docker)
- **Communication**: stdio via `docker exec -i`
- **Protocol**: JSON-RPC 2.0, MCP version 2024-11-05
- **Tools**: `speak`, `list_voices`

### Edge TTS Service
- **Port**: 3006
- **Endpoints**: `/speak-from-file`, `/health`, `/stats`
- **Audio Output**: Windows MediaPlayer (PresentationCore assembly)
- **Temp Directory**: `C:/temp`
- **File Cleanup**: Automatic deletion after processing

### Audio Playback
- **Method**: PowerShell with System.Windows.Media.MediaPlayer
- **Format**: MP3
- **Duration Handling**: Waits for full playback completion
- **Location**: `C:/temp/edge-tts-{timestamp}.mp3`

