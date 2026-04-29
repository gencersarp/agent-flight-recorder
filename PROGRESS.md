# Progress Tracker

## Enhanced Replay & SDK Parity (2026-04-30)

### All Changes

1. **TypeScript SDK Examples** (`examples/ts_sdk_features.ts`):
   - Created a comprehensive example demonstrating auto-instrumentation (OpenAI/Anthropic mocks) and the new `replay` functionality.
   - Showcases both low-level `replay()` and the high-level `createReplayAdapter()`.

2. **Replay Mode: Live vs Stub** (`backend/src/index.ts`, `ui/src/app/runs/[id]/page.tsx`, `ui/src/lib/api.ts`):
   - Enhanced Backend `/replay` endpoint to support `mode=live` (creates a run shell) and `mode=stub` (copies all steps).
   - Added `AFR_REPLAY_URL` support in the backend to trigger external webhooks for live re-execution.
   - Updated UI with a mode selector (radio buttons) on the Run Detail page.
   - Updated UI to display alerts for live replay status/messages.

3. **SDK Replay Logic Fixes** (`sdks/typescript/src/index.ts`, `sdks/python/agent_flight_recorder/__init__.py`):
   - Fixed a bug where SDK `replay()` would cause duplicate steps by triggering a data-copy replay on the backend. It now uses `mode=live`.
   - Ensured both SDKs correctly set the `currentRunId` to the new replay run ID so re-executed steps are recorded in the correct place.

4. **Python SDK Parity** (`sdks/python/agent_flight_recorder/__init__.py`):
   - Implemented `create_replay_adapter` in Python to match the TypeScript SDK.
   - Added module-level convenience exports for `replay` and `create_replay_adapter`.
   - Updated `replay` to accept a dictionary of handlers (adapter).

5. **Test Maintenance**:
   - Updated `backend/src/__tests__/api.test.ts` to match the new naming convention for replayed runs (`[Replay:Stub] ...`).
   - Verified all tests pass across backend and both SDKs.

### Files Modified
- `backend/src/index.ts` — Added `mode` support to `/replay` and webhook triggering.
- `backend/src/__tests__/api.test.ts` — Updated test assertions.
- `ui/src/app/runs/[id]/page.tsx` — Added Replay Mode selector UI.
- `ui/src/lib/api.ts` — Updated `replayRun` signature.
- `sdks/typescript/src/index.ts` — Updated `replay` to use `mode=live`.
- `sdks/python/agent_flight_recorder/__init__.py` — Added `create_replay_adapter` and module exports.
- `examples/ts_sdk_features.ts` — New comprehensive example.

## Previous Sessions

### SDK & Replay Update (2026-04-10)
- Fixed backend Zod types.
- Added Anthropic support to TS SDK.
- Initial `replay()` implementation in both SDKs.

### Initial MVP (2026-03-27)
- Core backend with SQLite.
- Basic UI with timeline and diff.
- Initial Python/TS SDKs.

## Architecture Decisions
- **Live Replay Webhook**: The backend can now trigger an external service to start a replay. This allows the UI to initiate a "Live" re-run of an agent if the agent's environment provides a triggerable endpoint.
- **Run Shell Pattern**: `mode=live` replay creates a run with metadata linked to the original but no steps. This is the preferred way for SDK-based replays to avoid data duplication.
- **Adapter Pattern**: `ReplayAdapter` (or `create_replay_adapter`) is the recommended way for users to swap LLM/Tool implementations during replay, as it handles the recording of the new results automatically.

## Next Session TODO
- Enhance the UI's diff view to better handle "Live Re-execution" runs where the number of steps might differ from the original.
- Implement a "Search steps" feature in the Run Detail page to filter the timeline by text or step type.
- Add support for recording "State Snapshots" as mentioned in the spec (currently only LLM/Tool/System events are explicitly handled).

## Known Issues
- `AFR_REPLAY_URL` is a simple fire-and-forget webhook; it doesn't provide real-time feedback to the UI about the progress of the live run beyond the initial trigger.
- Python SDK auto-instrumentation for Anthropic/OpenAI depends on specific package versions (documented in README).
