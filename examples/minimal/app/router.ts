import { createRouter } from 'remix/fetch-router'
import { staticFiles } from 'remix/static-middleware'

import { routes } from './routes.ts'
import { home } from './controllers/home.tsx'
import { about } from './controllers/about.tsx'

export const router = createRouter({
  middleware: [
    staticFiles('./public', { cacheControl: 'public, max-age=3600' }),
  ],
})

router.map(routes.home, home)
router.map(routes.about, about)
