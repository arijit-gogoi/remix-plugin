import type { Controller, RequestContext } from 'remix/fetch-router'
import { Database, type TableRow } from 'remix/data-table'

import { routes } from '../../routes.ts'
import { books } from '../../data/schema.ts'
import { render } from '../../utils/render.tsx'

type Book = TableRow<typeof books>

export default {
  actions: {
    async index({ get }: RequestContext) {
      const db = get(Database)
      const all = await db.findMany(books, { orderBy: [['title', 'asc']] })

      return render(
        <>
          <h1>Books</h1>
          <div class="grid">
            {all.map((b: Book) => (
              <a class="card" href={routes.books.show.href({ slug: b.slug })}
                 style="text-decoration:none;color:inherit">
                <span class="price">${b.price.toFixed(2)}</span>
                <h3>{b.title}</h3>
                <small>{b.author}</small>
              </a>
            ))}
          </div>
        </>,
        { title: 'Books' },
      )
    },

    async show({ get, params }: RequestContext<{ slug: string }>) {
      const db = get(Database)
      const book = await db.findOne(books, { where: { slug: params.slug } })
      if (!book) return new Response('Not found', { status: 404 })

      return render(
        <>
          <h1>{book.title}</h1>
          <p><em>by {book.author}</em> · {book.genre} · {book.published_year}</p>
          <p style="font-size:1.25rem;font-weight:600">${book.price.toFixed(2)}</p>
          <p>{book.description}</p>

          <form method="post" action={routes.cart.api.add.href()}>
            <input type="hidden" name="slug" value={book.slug} />
            <button type="submit">Add to Cart</button>
          </form>

          <p style="margin-top:2rem"><a href={routes.books.index.href()}>← Back to books</a></p>
        </>,
        { title: book.title },
      )
    },
  },
} satisfies Controller<typeof routes.books>
