# Progress Tracker

## Project Polishing & Usability Enhancements (2026-05-19)

### All Changes

1. **Marketability & Documentation** (`README.md`):
   - Completely redesigned the README with a bold value proposition, emoji-rich feature list, and professional badges.
   - Added placeholders for media and improved architecture diagrams.
   - Simplified "Quick Start" to focus on the new `npm run dev` flow.

2. **Onboarding Experience** (`examples/seed_demo.py`):
   - Created a comprehensive demo script that generates a realistic multi-step agent run (Search -> Analysis -> Chart -> Summary).
   - Allows new users to see the full power of the UI (including image handling and branching) immediately.

3. **Developer Experience (DX)** (`package.json`):
   - Integrated `concurrently` and `wait-on` in the root project.
   - `npm run dev` now starts both backend and UI with labeled, color-coded logs.
   - UI now waits for backend health before attempting to boot, preventing race conditions.

4. **UI Polishing** (`ui/src/app/runs/[id]/page.tsx`, `ui/src/app/diff/page.tsx`):
   - **Copy to Clipboard**: Added buttons to all code blocks and text panels for quick access to prompt/response data.
   - **Relative Timing**: Each step now shows its offset from the run start (e.g., `+2.45s`), making it easier to analyze agent latency.
   - **Search in Diffs**: Added a search filter to the comparison page, allowing users to find specific steps within large diff results.
   - **Branch Discovery**: Improved the visibility of the "Branch" button to make the unique debugging feature more obvious.

5. **SDK Ergonomics** (`sdks/python/`, `sdks/typescript/`):
   - Added `FlightRecorder.auto_openai()` and `auto_anthropic()` methods.
   - These methods handle recorder instantiation and client wrapping in a single line, reducing integration friction.

### Files Modified
- `README.md` — Complete rewrite for marketability.
- `package.json` — Added concurrently/wait-on and improved scripts.
- `examples/seed_demo.py` — **NEW** file for demo seeding.
- `ui/src/app/runs/[id]/page.tsx` — Added CopyButton and relative time.
- `ui/src/app/diff/page.tsx` — Added search filter and view mode styling.
- `sdks/python/agent_flight_recorder/__init__.py` — Added auto methods.
- `sdks/typescript/src/index.ts` — Added auto methods.

## Step Branching & Custom Diff Handlers (2026-05-19)
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
