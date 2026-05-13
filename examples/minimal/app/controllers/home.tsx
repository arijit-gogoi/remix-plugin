import type { RequestContext } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export function home(_context: RequestContext) {
  return render(
    <main>
      <h1>Hello, Remix v3</h1>
      <p>This page was rendered on the server.</p>
      <p>
        See also <a href={routes.about.href()}>about</a>.
      </p>
    </main>,
    { title: 'Home' },
  )
}
