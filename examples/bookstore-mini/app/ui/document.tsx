import type { Handle, RemixNode } from 'remix/ui'

import { routes } from '../routes.ts'

export function Document(handle: Handle<{ title?: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? 'Bookstore'}</title>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; color: #222; }
          header, main, footer { max-width: 960px; margin: 0 auto; padding: 1.5rem 2rem; }
          header { display: flex; gap: 1.25rem; align-items: baseline; border-bottom: 1px solid #eee; }
          header a { text-decoration: none; color: #0a66ff; font-weight: 500; }
          h1 { font-size: 2rem; margin: 0 0 1rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; }
          .card { border: 1px solid #eee; border-radius: 12px; padding: 1rem; }
          .card h3 { margin: 0 0 0.25rem; font-size: 1.1rem; }
          .card small { color: #666; }
          .card .price { float: right; font-variant-numeric: tabular-nums; }
          form { display: flex; flex-direction: column; gap: 0.5rem; }
          input, textarea, select { font: inherit; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; }
          button { font: inherit; padding: 0.5rem 1rem; border: 0; border-radius: 6px; background: #0a66ff; color: white; cursor: pointer; }
          button.secondary { background: #eee; color: #222; }
          .err { color: #b00020; font-size: 0.85rem; }
        `}</style>
      </head>
      <body>
        <header>
          <a href={routes.home.href()}><strong>Bookstore</strong></a>
          <a href={routes.books.index.href()}>Books</a>
          <a href={routes.cart.index.href()}>Cart</a>
          <a href={routes.admin.index.href()} style="margin-left: auto">Admin</a>
        </header>
        <main>{handle.props.children}</main>
        <footer>
          <small>bookstore-mini · Remix v3 example</small>
        </footer>
      </body>
    </html>
  )
}
