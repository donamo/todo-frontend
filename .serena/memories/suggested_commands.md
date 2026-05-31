# Suggested Commands

- Install dependencies: `npm install`.
- Start dev server: `npm run dev`; Vite listens on `0.0.0.0:5173`. Main app: `http://localhost:5173`; login page if still present: `http://localhost:5173/login.html`.
- Production build: `npm run build` (`tsc -b && vite build`), output `dist/`.
- Run unit tests when present: `npm test` (`vitest run`).
- Regenerate GraphQL client artifacts when backend/schema/documents change: `npm run codegen`; watch mode: `npm run codegen:watch`.
- Health endpoint in container: `GET /health` should return `ok`.
- Serena memory sanity check after memory edits: `serena memories check` from project root.