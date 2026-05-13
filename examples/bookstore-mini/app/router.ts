import { asyncContext } from 'remix/async-context-middleware'
import { compression } from 'remix/compression-middleware'
import { createRouter } from 'remix/fetch-router'
import { formData } from 'remix/form-data-middleware'
import { logger } from 'remix/logger-middleware'
import { methodOverride } from 'remix/method-override-middleware'
import { staticFiles } from 'remix/static-middleware'
import { session } from 'remix/session-middleware'
import { createCookie } from 'remix/cookie'
import { createCookieSessionStorage } from 'remix/session/cookie-storage'

import { routes } from './routes.ts'
import { loadDatabase } from './middleware/database.ts'
import { home } from './controllers/home.tsx'
import { about } from './controllers/about.tsx'
import books from './controllers/books/controller.tsx'
import cart from './controllers/cart/controller.tsx'
import { adminIndex } from './controllers/admin/index.tsx'
import adminBooks from './controllers/admin/books/controller.tsx'

const sessionCookie = createCookie('__bookstore_session', {
  secrets:  [process.env.SESSION_SECRET ?? 'dev-secret-not-for-prod'],
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path:     '/',
  maxAge:   60 * 60 * 24 * 30,
})

const sessionStorage = createCookieSessionStorage()

export function createBookstoreRouter() {
  const middleware = []

  if (process.env.NODE_ENV !== 'production') middleware.push(logger())
  middleware.push(compression())
  middleware.push(staticFiles('./public', { cacheControl: 'public, max-age=3600' }))
  middleware.push(formData({}))
  middleware.push(methodOverride())
  middleware.push(session(sessionCookie, sessionStorage))
  middleware.push(asyncContext())
  middleware.push(loadDatabase())

  const router = createRouter({ middleware })

  // Single Routes get inline handlers
  router.map(routes.home, home)
  router.map(routes.about, about)
  router.map(routes.admin.index, adminIndex)

  // RouteMaps get controllers
  router.map(routes.books, books)
  router.map(routes.cart, cart)
  router.map(routes.admin.books, adminBooks)

  return router
}
