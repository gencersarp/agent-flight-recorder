# Progress Tracker

## Global Search, Export & Lifecycle Management (2026-05-19)

### All Changes

1. **Markdown Export** (`ui/src/lib/export.ts`, `ui/src/app/runs/[id]/page.tsx`):
   - Created a professional Markdown generator that transforms a full agent run timeline into a shareable report.
   - Added an "Export MD" button to the run detail page.

2. **Run Deletion & Cleanup** (`backend/src/index.ts`, `ui/src/lib/api.ts`, `ui/src/app/page.tsx`, `ui/src/app/runs/[id]/page.tsx`):
   - Implemented `DELETE /api/runs/:id` to allow users to prune their local database.
   - Added delete buttons with confirmation dialogs to both the main runs list and the detail page.

3. **Real-time UI Polling** (`ui/src/app/page.tsx`, `ui/src/app/runs/[id]/page.tsx`):
   - Added intelligent polling logic that automatically refreshes the UI every 2-3 seconds if any run is currently "running" or "replaying".
   - Added a manual "Refresh" button for quick updates.

4. **Global Step Search** (`backend/src/index.ts`):
   - Added a high-performance `GET /api/steps/search` endpoint.
   - Developers can now search for specific strings (like specific errors or prompt fragments) across the entire history of all agent runs.

### Files Modified
- `backend/src/index.ts` — Added DELETE and Global Search endpoints.
- `ui/src/lib/api.ts` — Added `deleteRun`.
- `ui/src/lib/export.ts` — **NEW** file for Markdown generation.
- `ui/src/app/page.tsx` — Added deletion UI and list polling.
- `ui/src/app/runs/[id]/page.tsx` — Added Export, Delete, and detail polling.

## Project Polishing & Usability Enhancements (2026-05-19)
...

## Previous Sessions
... (rest of previous sessions)

## Architecture Decisions
- **LCS Alignment for Diffs**: Using LCS instead of index-matching for steps ensures that "Live" re-runs are accurately compared.
- **Handler Registry**: Decoupling diff logic from the main `DiffPage` allows for easy extension without bloating the main component.
- **Partial Copy for Branching**: Branched runs copy all preceding steps from the original run to preserve context for the re-execution.

## Next Session TODO
- **SDK "Branch Bootstrapping"**: Update SDKs to allow an agent to automatically fetch and restore its internal state from existing steps when started as a branched run.
- **Image Diff Enhancement**: Implement actual pixel-diffing (visual overlay) instead of just side-by-side display.
- **Websocket Feedback**: Add real-time step streaming in the UI for running/replaying agents.

## Known Issues
- `Noise Filter` currently uses a simple side-by-side JSON display instead of a full line-by-line diff for the filtered object.
- Side-by-side view might be cramped on very small screens; need better responsive handling.
