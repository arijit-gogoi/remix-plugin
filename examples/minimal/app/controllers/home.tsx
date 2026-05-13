import type { Controller } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export default {
  actions: {
    index() {
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
    },
  },
} satisfies Controller<typeof routes.home>
