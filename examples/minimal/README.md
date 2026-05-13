# examples/minimal — the smallest viable Remix v3 app

A complete Remix v3 application in five files:

```
minimal/
├── package.json
├── tsconfig.json
├── server.ts
└── app/
    ├── routes.ts
    ├── router.ts
    ├── controllers/
    │   ├── home.tsx
    │   └── about.tsx
    └── ui/
        └── document.tsx
```

## What it shows

- `server.ts`: how to wrap a Remix `router` into a Node `http.Server` with `createRequestListener`.
- `app/routes.ts`: a typed route map with two routes.
- `app/router.ts`: the router and one piece of middleware (`staticFiles`).
- `app/controllers/{home,about}.tsx`: two controllers returning HTML.
- `app/ui/document.tsx`: the page shell.

This is enough to deploy. Add middleware, controllers, and routes as the app grows.

## Run

```pwsh
npm install
npm run dev      # http://localhost:3000
```

## Compare to bootstrap output

The `remix new` CLI produces a similar layout. The interesting differences are intentional — this version is hand-tuned to be the *absolute minimum* readable example.
