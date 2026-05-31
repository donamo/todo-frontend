# Todo Workspace frontend

React + TypeScript + Vite frontend az AI-alapú személyes projekt- és feladatkezelőhöz.

## Funkciók

- Dashboard nyitott, lejárt, következő és aktív projekt számlálókkal.
- Epic, project, stage és todo alapú munkafelület.
- Gyors todo rögzítés inboxba, projecthez vagy stage-hez.
- Project, stage, label és projektjegyzet létrehozás.
- Todo szűrés nézet, projekt, stage, label, prioritás és státusz szerint.
- Todo státusz, prioritás, next action, milestone és készre jelölés GraphQL mutációkkal.
- Projekt progress és AI státusz jelentés megjelenítés.

## Stack

| Terület | Technológia |
| --- | --- |
| App | React 19 + TypeScript + Vite |
| API | Apollo Client GraphQL |
| REST | Csak infrastruktúra/auth endpointokhoz |
| Stílus | Tailwind CSS |
| Build | `tsc -b && vite build` |

## Környezeti változók

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_LOG_LEVEL=DEBUG
```

`VITE_API_BASE_URL`: backend alap URL. Default: `http://localhost:3000`.

`VITE_LOG_LEVEL`: kliens log szint. Lehetséges értékek: `DEBUG`, `INFO`, `WARN`, `ERROR`. Default: `DEBUG`.

A GraphQL endpoint:

```text
${VITE_API_BASE_URL}/graphql
```

## Fejlesztés

```bash
npm install
npm run dev
```

Alap URL:

```text
http://localhost:5173
```

## Ellenőrzés

```bash
npm run build
npm test
```
