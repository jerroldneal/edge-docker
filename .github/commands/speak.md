# Speak Command

**Command**: `@workspace /speak <message>`

## Description

Speaks a message aloud using Windows text-to-speech.

## Prerequisites

Windows vocalization service must be running:

```bash
cd tryout-vocalize-framework
npm start
```

## Usage

```
@workspace /speak Task completed successfully
@workspace /speak Build finished with no errors
@workspace /speak Tests are passing
@workspace /speak Buongiorno
```

## Examples

**Success Notification:**
```
@workspace /speak All tests passed successfully
```

**Build Status:**
```
@workspace /speak Docker containers are now running
```

**Error Alert:**
```
@workspace /speak Warning: Build failed, check logs
```

## Workflow Integration

Use at the end of agent tasks for audio feedback:

1. Agent completes a build
2. Agent runs `/speak Build completed`
3. User hears confirmation through speakers
