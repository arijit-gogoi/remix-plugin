import type { Controller } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { render } from '../utils/render.tsx'

export default {
  actions: {
    index() {
      return render(
        <>
          <h1>A small bookstore</h1>
          <p>This is a focused slice of the official Remix v3 bookstore demo.</p>
          <p>
            Start at <a href={routes.books.index.href()}>the catalogue</a> or
            head to <a href={routes.admin.index.href()}>admin</a> to manage stock.
          </p>
        </>,
        { title: 'Home' },
      )
    },
  },
} satisfies Controller<typeof routes.home>
