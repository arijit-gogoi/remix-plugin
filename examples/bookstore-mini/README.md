# examples/bookstore-mini — a focused slice of the bookstore demo

This is an *adapted slice* of the official `remix-run/remix/demos/bookstore`. It shows the canonical patterns for Remix v3 in one small place:

- A central `app/routes.ts` with `route()`, `form()`, and `resources()`.
- A middleware stack with `logger`, `compression`, `staticFiles`, `formData`, `methodOverride`, `session`, `asyncContext`, and a `loadDatabase()` of our own.
- A `data-table` schema with SQLite.
- One controller per top-level area: a public-facing `BooksController`, a `CartController`, and an admin `BooksController` with full CRUD.
- A session-based `cart` so adding to cart works without auth.

For the full bookstore experience (auth, password reset, order checkout, file uploads), see the official `demos/bookstore` in the remix-run/remix repository.

## Verified vs inferred

The patterns here (routes, controllers, middleware composition, `data-table` schema, session-backed cart, `data-schema` form validation via `parseSafe`) come straight from the upstream bookstore demo. A few small pieces — exact import paths for `redirect`, the `$inferRow` row type, the `coerce.boolean` behaviour on unchecked checkboxes — should be cross-checked against the installed `remix` package before this app is run for real. If a snippet doesn't compile, the framework's types are authoritative.

## Run

```pwsh
npm install
npm run dev      # http://localhost:3000
```

The SQLite file lives at `./db/bookstore.sqlite` and is created on first boot.

## Layout

```
bookstore-mini/
├── package.json
├── tsconfig.json
├── server.ts                 ← boots db, then http.createServer
└── app/
    ├── data/
    │   ├── schema.ts         ← books, users, orders tables
    │   └── setup.ts          ← create the db + apply migrations + seed
    ├── middleware/
    │   └── database.ts       ← attach Database key to every request
    ├── controllers/
    │   ├── books/controller.tsx     ← public catalogue
    │   ├── cart/controller.tsx      ← add/remove items via session
    │   └── admin/books/controller.tsx ← full CRUD on books
    ├── ui/
    │   └── document.tsx
    ├── utils/
    │   └── render.tsx
    ├── routes.ts
    └── router.ts
```

## What to read first

1. `app/routes.ts` — the URL contract.
2. `app/router.ts` — the middleware stack.
3. `app/controllers/admin/books/controller.tsx` — the most interesting controller (CRUD with `data-schema` validation).
4. `app/data/schema.ts` — how tables are defined.
5. `server.ts` — the boot sequence.
