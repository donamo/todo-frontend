# Tech Stack

- Language: TypeScript, strict mode via project references (`tsconfig.json` -> `tsconfig.app.json`, `tsconfig.node.json`). App compiler options include `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `isolatedModules`, `moduleResolution: bundler`, JSX `react-jsx`.
- Runtime/framework: React 19 with Vite 6 and `@vitejs/plugin-react`.
- Package manager: npm with committed `package-lock.json`; use npm consistently.
- Styling: Tailwind CSS 3 with CSS variables in `src/styles.css` and local UI primitives in `src/components/ui/`.
- UI helpers: `class-variance-authority` for variants, `tailwind-merge` + `clsx` through `cn`, Radix Slot for polymorphic buttons, lucide-react icons.
- Data/API: Apollo Client 3 for GraphQL at `${API_BASE_URL}/graphql`; minimal REST auth fetches in `src/lib/auth.ts`; zod validates `/auth/me` response shape.
- State/forms: Zustand for auth store; react-hook-form + zod resolver are installed.
- GraphQL codegen: `@graphql-codegen/cli` configured in `codegen.ts`, schema from `external/schema.graphql`, documents from `src/**/*.{ts,tsx,graphql}`, output `src/gql/` ignored by git.
- Container: multi-stage Dockerfile builds the Vite app and serves `dist/` from nginx; `docker-entrypoint.sh` writes runtime `/usr/share/nginx/html/env-config.js` from `API_BASE_URL`.