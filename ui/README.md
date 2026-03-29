# Agent Flight Recorder - Web UI

The web dashboard for inspecting, searching, and comparing recorded agent runs.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State/Fetching**: React Server Components & Client Hooks
- **Diffing**: Myers LCS-based algorithm for structural comparisons

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

The UI expects the backend API to be available at the URL specified in `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api`).

## Build

To create a production build:
```bash
npm run build
```
The output will be in the `.next` directory.
