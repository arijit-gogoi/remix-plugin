import type { RequestContext } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export function about(_context: RequestContext) {
  return render(
    <main>
      <h1>About</h1>
      <p>The minimal Remix v3 example.</p>
      <p>
        Back to <a href={routes.home.href()}>home</a>.
      </p>
    </main>,
    { title: 'About' },
  )
}
