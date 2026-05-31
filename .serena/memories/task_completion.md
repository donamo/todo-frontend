# Task Completion

- For TypeScript/app changes, run `npm run build` before handoff. It performs project typecheck via `tsc -b` and Vite production build.
- For behavior covered by tests or when adding logic with testable branches, run `npm test` after the build or targeted edits.
- For GraphQL document/schema/type changes, run `npm run codegen` if backend schema/generated client artifacts need refreshing; verify generated `src/gql/` remains intentionally ignored unless project policy changes.
- For Docker/runtime config changes, at minimum run `npm run build`; when Dockerfile/nginx/entrypoint behavior changes materially, build the image with `docker build -t todo-frontend .` if Docker is available.
- Check `git status --short` before final response and mention only files changed for the current task; do not revert unrelated dirty files.
