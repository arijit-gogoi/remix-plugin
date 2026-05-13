import type { Controller, RequestContext } from 'remix/fetch-router'
import { Database, type TableRow } from 'remix/data-table'
import { Session } from 'remix/session'
import { redirect } from 'remix/response/redirect'

import { routes } from '../../routes.ts'
import { books } from '../../data/schema.ts'
import { render } from '../../utils/render.tsx'

type Cart = Record<string, number>

function readCart(session: Session): Cart {
  const raw = session.get('cart')
  return typeof raw === 'object' && raw !== null ? (raw as Cart) : {}
}
function writeCart(session: Session, cart: Cart) {
  session.set('cart', cart)
}

export default {
  actions: {
    async index({ get }: RequestContext) {
      const db = get(Database)
      const session = get(Session)
      const cart = readCart(session)

      const slugs = Object.keys(cart)
      if (slugs.length === 0) {
        return render(
          <>
            <h1>Cart</h1>
            <p>Your cart is empty.</p>
            <p><a href={routes.books.index.href()}>Browse books →</a></p>
          </>,
          { title: 'Cart' },
        )
      }

      const items = await Promise.all(
        slugs.map(async (slug) => {
          const book = await db.findOne(books, { where: { slug } })
          return book ? { book, qty: cart[slug] } : null
        }),
      )

      const rows = items.filter((x): x is { book: TableRow<typeof books>; qty: number } => x !== null)
      const total = rows.reduce((s, r) => s + r.book.price * r.qty, 0)

      return render(
        <>
          <h1>Cart</h1>
          <div class="grid">
            {rows.map(({ book, qty }) => (
              <div class="card">
                <span class="price">${(book.price * qty).toFixed(2)}</span>
                <h3>{book.title}</h3>
                <small>{book.author} · qty {qty}</small>
                <form method="post" action={routes.cart.api.remove.href()} style="margin-top:0.5rem">
                  <input type="hidden" name="_method" value="DELETE" />
                  <input type="hidden" name="slug" value={book.slug} />
                  <button class="secondary" type="submit">Remove</button>
                </form>
              </div>
            ))}
          </div>
          <p style="margin-top:1.5rem;font-weight:600">Total: ${total.toFixed(2)}</p>
        </>,
        { title: 'Cart' },
      )
    },

    api: {
      actions: {
        add({ get }: RequestContext) {
          const session = get(Session)
          const formData = get(FormData)
          const slug = String(formData.get('slug') ?? '')
          if (!slug) return new Response('missing slug', { status: 400 })

          const cart = readCart(session)
          cart[slug] = (cart[slug] ?? 0) + 1
          writeCart(session, cart)

          return redirect(routes.cart.index.href())
        },

        remove({ get }: RequestContext) {
          const session = get(Session)
          const formData = get(FormData)
          const slug = String(formData.get('slug') ?? '')

          const cart = readCart(session)
          delete cart[slug]
          writeCart(session, cart)

          return redirect(routes.cart.index.href())
        },
      },
    },
  },
} satisfies Controller<typeof routes.cart>
