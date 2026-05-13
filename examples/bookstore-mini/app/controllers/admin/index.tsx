import type { RequestContext } from 'remix/fetch-router'

import { routes } from '../../routes.ts'
import { render } from '../../utils/render.tsx'

export function adminIndex(_context: RequestContext) {
  return render(
    <>
      <h1>Admin</h1>
      <p>
        Manage the catalogue: <a href={routes.admin.books.index.href()}>books</a>.
      </p>
      <p>
        (A real admin area would gate this behind <code>requireAuth()</code> and a role check —
        see <code>skills/auth/SKILL.md</code>.)
      </p>
    </>,
    { title: 'Admin' },
  )
}
