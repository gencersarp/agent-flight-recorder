# 🛰️ Agent Flight Recorder (AFR)

> **"What did my agent just do?"** — Never ask that question again.

Agent Flight Recorder is a local-first, black box recorder for LLM agents. It captures every LLM call, tool invocation, and system event, allowing you to inspect, replay, and diff runs with surgical precision.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## ✨ Features

- 🕵️ **Full Traceability**: Record every prompt, response, and tool call in real-time.
- 🔄 **Step Branching**: Found a bug at step 5? Branch the run from there and test a new fix instantly.
- ⚖️ **Visual Diffs**: Compare two runs side-by-side. Spot exactly where the logic diverged.
- 🖼️ **Rich Media Support**: Specialized diff handlers for images, JSON noise filtering, and more.
- 🔌 **Auto-Instrumentation**: Zero-config wrappers for OpenAI and Anthropic clients.
- 🏠 **Local-First**: Your data stays on your machine. Powered by SQLite (WAL mode) for blazing speed.

---

## 🚀 Quick Start

### 1. Start the Recorder
```bash
# Clone and install
git clone https://github.com/gencersarp/agent-flight-recorder.git
cd agent-flight-recorder
npm run install:all

# Launch the server & dashboard
npm run dev
```
Visit `http://localhost:3000` to see your dashboard.

### 2. Instrument Your Agent

#### Python
```python
from agent_flight_recorder import FlightRecorder, wrap_openai
from openai import OpenAI

client = OpenAI()
recorder = FlightRecorder()
wrap_openai(client, recorder)

with recorder.run(name="Research Task", model="gpt-4"):
    # Everything is automatically recorded!
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "How do black holes work?"}]
    )
```

#### TypeScript
```typescript
import { FlightRecorder, wrapOpenAI } from "agent-flight-recorder";
import OpenAI from "openai";

const client = new OpenAI();
const recorder = new FlightRecorder();
wrapOpenAI(client, recorder);

await recorder.withRun({ name: "Research Task" }, async () => {
  const completion = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "How do black holes work?" }],
  });
});
```

---

## 🛠️ Architecture

AFR is designed to be lightweight and unobtrusive.

- **Backend**: Express + SQLite (WAL) — High-concurrency, zero-maintenance.
- **Frontend**: Next.js 14 + Tailwind CSS — Beautiful, responsive, and fast.
- **SDKs**: Lightweight wrappers that don't block your agent's execution.

---

## 🔍 Deep Dive: Replay & Branching

AFR isn't just a logger; it's a debugger.
- **Replay**: Re-run an agent with the exact same inputs to verify consistency.
- **Branch**: Click "Branch" on any step in the timeline to start a new run from that specific point in time. Perfect for fixing logic errors mid-flight.

---

## 📖 Documentation

<details>
<summary><b>API Reference</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check & stats |
| POST | `/api/runs/start` | Start a new run |
| POST | `/api/runs/:id/step` | Record a step |
| POST | `/api/runs/:id/finish` | Mark run completed |
| GET | `/api/runs` | List runs (paginated) |
| GET | `/api/runs/:id` | Get run details |
| POST | `/api/runs/:id/replay` | Replay/Branch run |

</details>

<details>
<summary><b>Configuration</b></summary>

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `AFR_API_KEY` | Optional API key for auth | None |
| `PORT` | Backend port | 3001 |
| `DATABASE_URL` | SQLite path | `backend/data.db` |

</details>

---

## 🤝 Contributing

We love contributions! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## 📄 License

MIT © [Gencer Sarp](https://github.com/gencersarp)
