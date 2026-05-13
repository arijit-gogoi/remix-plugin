import type { RequestContext } from 'remix/fetch-router'

import { render } from '../utils/render.tsx'

export function about(_context: RequestContext) {
  return render(
    <>
      <h1>About this example</h1>
      <p>
        This is a focused slice of the bookstore demo, designed to fit in a single
        readable example app. Auth, password reset, file uploads, and order checkout
        are intentionally omitted — see the full <a href="https://github.com/remix-run/remix/tree/main/demos/bookstore">official demo</a> for those.
      </p>
    </>,
    { title: 'About' },
  )
}
