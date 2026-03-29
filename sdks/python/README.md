# Agent Flight Recorder - Python SDK

The official Python client for recording LLM agent runs.

## Installation

```bash
pip install agent-flight-recorder
```

## Basic Usage

```python
from agent_flight_recorder import FlightRecorder

recorder = FlightRecorder("http://localhost:3001/api")

with recorder.run(name="My Agent", model="gpt-4"):
    recorder.record_llm_call(
        prompt="What is 2+2?",
        response="4",
        model="gpt-4"
    )
```

## Features

- **Context Manager**: Automatically handles run start and finish (including errors)
- **OpenAI Auto-instrumentation**: Wrap your OpenAI client to record completions automatically
- **Decorators**: `@record()` decorator for tracking tool functions
- **Graceful Degradation**: SDK logs warnings if the server is unreachable instead of crashing your agent

## Development

1. Install dependencies:
   ```bash
   pip install -e .[dev]
   ```

2. Run tests:
   ```bash
   pytest tests/
   ```
