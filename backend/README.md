# Agent Flight Recorder - Backend API

The Express-based API server for recording, persisting, and querying agent runs.

## Tech Stack

- **Server**: [Express](https://expressjs.com/) (Node.js)
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (SQLite)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the database migration and development server:
   ```bash
   npm run dev
   ```

## Configuration

- `PORT`: Server port (default: 3001)
- `AFR_API_KEY`: Optional API key for authentication
- `DATABASE_URL`: Path to the SQLite database file (default: `./data.db`)

## Features

- **Transactions**: Multi-statement operations use db.transaction()
- **WAL Mode**: Enabled for high concurrency
- **Migrations**: Automated schema versioning
- **Auth**: Optional Bearer token authentication
- **Rich Queries**: Filtering by status, model, tags, and date ranges
- **Replay**: Duplicate existing runs for comparison
- **Diffing**: Server-side structured comparison of runs
