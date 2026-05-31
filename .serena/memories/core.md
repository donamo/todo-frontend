# Core

- tanulas frontend: RSS / Dev News frontend direction. The current source still contains an older creative timeline app; old domain code is sample material and may be removed when not needed for the RSS frontend.
- React/Vite SPA with TypeScript. Current source has two HTML entrypoints (`index.html`, `login.html`) and runtime page selection in `src/main.tsx`.
- Expected new domain: RSS feeds, articles, read/status state, important marker, AI summaries, and Dev News style article browsing.
- Backend contract direction: REST only for auth/infrastructure; domain operations should go through GraphQL.
- Current source map before RSS rewrite:
  - `src/pages/`: legacy page-level flows (`login-page.tsx`, `timeline-page.tsx`, `admin-page.tsx`).
  - `src/components/`: legacy app shell, project dialog, UI primitives.
  - `src/graphql/`: legacy GraphQL documents.
  - `src/lib/`: Apollo, auth, runtime config, utilities.
  - `src/stores/auth-store.ts`: Zustand auth state.
  - `external/schema.graphql` and `external/openapi.yaml`: backend contract references, currently may still be legacy.
- Runtime API URL precedence is defined in `src/lib/config.ts`; do not hardcode backend URLs.
