# Binding Controllers

In `app/router.ts`, route maps from `app/routes.ts` are mapped to controllers via `router.map`.

## `router.map(routeOrMap, controller)`

```ts
router.map(routes.home, homeController)
router.map(routes.admin.books, adminBooksController)
```

The controller's shape must mirror the route map (or single route):

- For a leaf `Route`: the controller is `{ actions: { index|create|… } }`.
- For a nested route map: the controller has matching keys, each itself a controller.

TypeScript enforces this — a missing action is a compile error.

## Inline routes — `router.get` / `router.post` / etc.

For one-off endpoints (often health checks, webhooks), skip the route-map abstraction:

```ts
router.get('/health', () => Response.json({ ok: true }))

router.post('/webhooks/stripe', async ({ request }) => {
  const event = await request.json()
  // …
  return new Response('OK')
})
```

Inline routes still participate in the middleware stack — they just don't appear in `app/routes.ts`.

## Inline middleware on a route

```ts
router.post(routes.cart.api.add, {
  middleware: [requireAuth()],
  async handler({ get, request }) {
    // …
  },
})
```

The object form lets you stack middleware for a single endpoint without spinning up a controller.

## Order matters

`router.map` calls register routes in the order they appear. Within the same path two registrations would collide; the framework throws to surface the bug. Inline `router.get`/`router.post` registrations live in the same table.
