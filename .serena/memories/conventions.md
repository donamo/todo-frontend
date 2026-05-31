# Conventions

- Keep UI text Hungarian unless integrating technical identifiers or backend-provided labels.
- Prefer local UI primitives from `src/components/ui/` over raw controls for app-facing forms/buttons/cards.
- Component style: functional React components, typed props inline for small components, extracted `type` aliases for reused shapes.
- Styling: Tailwind utility classes and theme tokens from `src/styles.css`; use `cn` for conditional class composition.
- Buttons use `Button` variants from `src/components/ui/button.tsx`; lucide-react icons are available and preferred for icon actions.
- API/auth invariant: every backend request that relies on the session cookie must set `credentials: "include"`.
- Runtime config invariant: do not hardcode backend URLs in features; import `API_BASE_URL` or `GRAPHQL_URL` from `src/lib/config.ts`.
- The old timeline domain is not a product requirement. Remove or replace legacy screens, labels, GraphQL operations, and mock/domain types when implementing RSS frontend features.
- Generated GraphQL output `src/gql/` is ignored; generated files should not be edited by hand when codegen is used.
- Docker runtime env is injected at container start through `env-config.js`; avoid requiring rebuilds for API URL changes.
