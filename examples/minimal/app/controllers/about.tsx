import type { Controller } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export default {
  actions: {
    index() {
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
    },
  },
} satisfies Controller<typeof routes.about>
