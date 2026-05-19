# Progress Tracker

## Step Branching & Custom Diff Handlers (2026-05-19)

### All Changes

1. **Step Branching** (`backend/src/index.ts`, `ui/src/app/runs/[id]/page.tsx`, `ui/src/lib/api.ts`):
   - Enhanced `/api/runs/:id/replay` to accept `until_step_id`, allowing runs to be truncated at any point.
   - Added a "Branch" button to each step in the timeline. Clicking it triggers a live replay up to that step.
   - Branched runs are marked in metadata with `branched_from_step_id`.

2. **Custom Diff Handlers** (`ui/src/lib/diff-handlers.tsx`, `ui/src/app/diff/page.tsx`):
   - Created a registry for specialized diff rendering logic.
   - **Image Diff**: Automatically detects image payloads (URL or base64) and shows them side-by-side.
   - **Noise Filter**: A JSON handler that excludes common volatile keys (e.g., `timestamp`, `id`, `created_at`) to reduce diff noise.
   - Refactored `StepDiff` to dynamically pick the best handler or fallback to text diff.

3. **Split-View Diff** (`ui/src/app/diff/page.tsx`):
   - Added a "Side-by-side" view mode in the diff page.
   - Implemented an alignment algorithm for split views based on the Myers diff results.
   - Added a UI toggle to switch between "Unified" and "Side-by-side" views.

### Files Modified
- `backend/src/index.ts` — Enhanced replay endpoint for branching.
- `ui/src/lib/api.ts` — Updated `replayRun` API and added `STATE_SNAPSHOT` to `Step` type.
- `ui/src/app/runs/[id]/page.tsx` — Added "Branch" button and logic.
- `ui/src/app/diff/page.tsx` — Added split view, handlers, and Suspense wrapper.
- `ui/src/lib/diff-handlers.tsx` — **NEW** file for custom diff logic.

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
