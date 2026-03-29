# Agent Flight Recorder - TypeScript SDK

The official TypeScript/JavaScript client for recording LLM agent runs.

## Installation

```bash
npm install agent-flight-recorder
```

## Basic Usage

```typescript
import { FlightRecorder } from "agent-flight-recorder";

const recorder = new FlightRecorder("http://localhost:3001/api");

await recorder.withRun({ name: "My Agent", model: "gpt-4" }, async (rec) => {
  await rec.recordLlmCall({
    prompt: "What is 2+2?",
    response: "4",
    model: "gpt-4",
  });
});
```

## Features

- **Asynchronous**: Native `fetch`-based implementation with full Promise support
- **Context Manager**: `withRun` automatically handles run start/finish and errors
- **OpenAI Integration**: `wrapOpenAI` patches the official client for auto-recording
- **Fetch Interception**: `wrapFetch` records all LLM API calls globally
- **Type-safe**: Built with TypeScript for full autocompletion support

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Build:
   ```bash
   npm run build
   ```
