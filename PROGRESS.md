# Progress Tracker

## SDK & Replay Update (2026-04-10)

### All Changes

1. **Backend Bug Fixes** (`backend/src/index.ts`):
   - Fixed TypeScript compilation errors by explicitly typing `z.record(z.string(), z.any())`.
   - Cast `req.params.id` to `string` to resolve `string | string[]` type mismatches.
   - These fixes resolved the 500 errors previously seen in backend tests.

2. **TypeScript SDK - Anthropic Support** (`sdks/typescript/src/index.ts`):
   - Added `wrapAnthropic(client, recorder)` to patch `@anthropic-ai/sdk` messages.create.
   - Provides feature parity with the Python SDK.

3. **Replay Functionality** (`sdks/python/agent_flight_recorder/__init__.py`, `sdks/typescript/src/index.ts`):
   - Implemented `replay(runId, handlers)` method in both SDKs.
   - Automates the process of: triggering a replay run on the backend, fetching original steps, and executing user-provided callbacks for each step.
   - Allows users to programmaticly re-run agents with stubs or live LLMs while recording results for comparison.

4. **Root Test Script** (`package.json`):
   - Added `"test": "..."` script to the root `package.json`.
   - Runs `npm test` for backend, `npm test` for TS SDK, and `pytest` for Python SDK in sequence.

5. **Documentation Update** (`README.md`):
   - Added documentation and examples for `wrapAnthropic` and `replay` in both languages.
   - Added instructions for running all tests via the root script.

6. **Tests Added**:
   - `sdks/typescript/src/__tests__/sdk.test.ts`: Added tests for `wrapAnthropic` and `FlightRecorder.replay`.
   - `sdks/python/tests/test_sdk.py`: Added `TestReplay` class to verify the Python replay implementation.

### Files Modified
- `backend/src/index.ts` — Type fixes for Zod and Express params.
- `sdks/typescript/src/index.ts` — Added `wrapAnthropic` and `replay`.
- `sdks/typescript/src/__tests__/sdk.test.ts` — New tests for Anthropic and Replay.
- `sdks/python/agent_flight_recorder/__init__.py` — Added `replay`.
- `sdks/python/tests/test_sdk.py` — New tests for Replay.
- `package.json` — Added root `test` script.
- `README.md` — Updated with new features and test instructions.
- `PROGRESS.md` — This file.

## Previous Session (2026-03-27)

### Completed
1. Production-ready update with error handling, validation, pagination, filtering.
2. API Key Auth, Health Check, Replay/Compare endpoints.
3. Myers diff algorithm in UI.
4. Docker support and comprehensive README.

## Architecture Decisions
- **SDK Replay Pattern**: Uses a handler-based callback system (`onLlmCall`, `onToolCall`). This decouples the re-execution logic from the SDK, allowing users to either return original results (stub mode) or re-invoke real APIs.
- **Strict Typing**: Explicitly typing Zod records and casting request parameters to avoid environment-specific TypeScript inference issues.
- **Unified Testing**: Root `npm test` ensures all components of the monorepo are functional before commit.

## Next Session TODO
- Add a sample TypeScript agent in `examples/` to demonstrate the TS SDK.
- Enhance the UI's replay functionality to allow choosing between "Data Copy" (current) and "Live Re-execution" (triggering an external endpoint or SDK).
- Implement a more advanced "Replay Adapter" in the SDKs that can automatically swap LLM/Tool implementations.

## Known Issues
- UI still lacks automated tests (e.g., Playwright or Vitest for components).
- Python SDK tests require `requests` and `pytest` to be installed in the environment (documented in README).
