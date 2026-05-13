import type { Controller, RequestContext } from 'remix/fetch-router'
import type { Handle } from 'remix/ui'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import * as coerce from 'remix/data-schema/coerce'
import { Database, type TableRow } from 'remix/data-table'
import { redirect } from 'remix/response/redirect'

import { routes } from '../../../routes.ts'
import { books } from '../../../data/schema.ts'
import { render } from '../../../utils/render.tsx'

type Book = TableRow<typeof books>
// Mirrors the readonly StandardSchemaV1 Issue shape that parseSafe returns.
type Issue = { readonly path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>; readonly message: string }

const bookSchema = f.object({
  slug:           f.field(s.string()),
  title:          f.field(s.string()),
  author:         f.field(s.string()),
  description:    f.field(s.string()),
  price:          f.field(coerce.number()),
  genre:          f.field(s.string()),
  isbn:           f.field(s.string()),
  publishedYear:  f.field(coerce.number()),
  coverUrl:       f.field(s.string()),
  inStock:        f.field(coerce.boolean()),
})

type BookFormProps = {
  values?: Partial<Book>
  action: string
  method?: 'POST' | 'PUT'
  submit: string
  errors?: ReadonlyArray<Issue>
}

function BookForm(handle: Handle<BookFormProps>) {
  return () => {
    const v = handle.props.values ?? {}
    const e = handle.props.errors ?? []
    const err = (field: string) => e
      .filter((i) => {
        const first = i.path?.[0]
        const key = typeof first === 'object' && first !== null ? first.key : first
        return key === field
      })
      .map((i) => i.message)

    return (
      <form method="post" action={handle.props.action}>
        {handle.props.method === 'PUT' && <input type="hidden" name="_method" value="PUT" />}

        <label>Slug<input name="slug" value={v.slug ?? ''} required /></label>
        {err('slug').map((m) => <p class="err">{m}</p>)}

        <label>Title<input name="title" value={v.title ?? ''} required /></label>
        <label>Author<input name="author" value={v.author ?? ''} required /></label>
        <label>Description<textarea name="description">{v.description ?? ''}</textarea></label>
        <label>Price<input name="price" type="number" step="0.01" value={v.price ?? ''} required /></label>
        <label>Genre<input name="genre" value={v.genre ?? ''} required /></label>
        <label>ISBN<input name="isbn" value={v.isbn ?? ''} required /></label>
        <label>Published year<input name="publishedYear" type="number" value={v.published_year ?? ''} required /></label>
        <label>Cover URL<input name="coverUrl" value={v.cover_url ?? '/images/placeholder.jpg'} required /></label>
        <label>
          <input name="inStock" type="checkbox" checked={v.in_stock ?? true} value="true" />
          {' '}In stock
        </label>

        <button type="submit">{handle.props.submit}</button>
      </form>
    )
  }
}

export default {
  actions: {
    async index({ get }: RequestContext) {
      const db = get(Database)
      const all = await db.findMany(books, { orderBy: [['id', 'asc']] })
      return render(
        <>
          <h1>Admin · Books</h1>
          <p><a href={routes.admin.books.new.href()}><button>New book</button></a></p>
          <table style="width:100%;border-collapse:collapse;margin-top:1rem">
            <thead><tr style="text-align:left">
              <th>Title</th><th>Author</th><th>Price</th><th>Stock</th><th></th>
            </tr></thead>
            <tbody>
              {all.map((b: Book) => (
                <tr style="border-top:1px solid #eee">
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>${b.price.toFixed(2)}</td>
                  <td>{b.in_stock ? 'yes' : 'no'}</td>
                  <td>
                    <a href={routes.admin.books.edit.href({ bookId: String(b.id) })}>edit</a>{' · '}
                    <a href={routes.admin.books.show.href({ bookId: String(b.id) })}>view</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>,
        { title: 'Admin · Books' },
      )
    },

    new() {
      return render(
        <>
          <h1>New book</h1>
          <BookForm action={routes.admin.books.create.href()} submit="Create" />
        </>,
        { title: 'New book' },
      )
    },

    async create({ get }: RequestContext) {
      const db = get(Database)
      const formData = get(FormData)
      const parsed = s.parseSafe(bookSchema, formData)
      if (!parsed.success) {
        return render(
          <>
            <h1>New book</h1>
            <BookForm action={routes.admin.books.create.href()} submit="Create" errors={parsed.issues} />
          </>,
          { status: 400, title: 'New book' },
        )
      }
      const v = parsed.value
      await db.create(books, {
        slug:           v.slug,
        title:          v.title,
        author:         v.author,
        description:    v.description,
        price:          v.price,
        genre:          v.genre,
        isbn:           v.isbn,
        cover_url:      v.coverUrl,
        published_year: v.publishedYear,
        in_stock:       v.inStock,
      })
      return redirect(routes.admin.books.index.href())
    },

    async show({ get, params }: RequestContext<{ bookId: string }>) {
      const db = get(Database)
      const book = await db.find(books, Number(params.bookId))
      if (!book) return new Response('Not found', { status: 404 })
      return render(
        <>
          <h1>{book.title}</h1>
          <p>{book.author}</p>
          <pre style="white-space:pre-wrap">{JSON.stringify(book, null, 2)}</pre>
          <p>
            <a href={routes.admin.books.edit.href({ bookId: params.bookId })}>Edit</a>
            {' · '}
            <a href={routes.admin.books.index.href()}>Back</a>
          </p>
        </>,
        { title: book.title },
      )
    },

    async edit({ get, params }: RequestContext<{ bookId: string }>) {
      const db = get(Database)
      const book = await db.find(books, Number(params.bookId))
      if (!book) return new Response('Not found', { status: 404 })
      return render(
        <>
          <h1>Edit book</h1>
          <BookForm
            action={routes.admin.books.update.href({ bookId: params.bookId })}
            method="PUT"
            submit="Save"
            values={book}
          />
        </>,
        { title: `Edit ${book.title}` },
      )
    },

    async update({ get, params }: RequestContext<{ bookId: string }>) {
      const db = get(Database)
      const formData = get(FormData)
      const parsed = s.parseSafe(bookSchema, formData)
      if (!parsed.success) {
        return render(
          <>
            <h1>Edit book</h1>
            <BookForm
              action={routes.admin.books.update.href({ bookId: params.bookId })}
              method="PUT"
              submit="Save"
              errors={parsed.issues}
            />
          </>,
          { status: 400, title: 'Edit book' },
        )
      }
      const v = parsed.value
      await db.update(books, Number(params.bookId), {
        slug:           v.slug,
        title:          v.title,
        author:         v.author,
        description:    v.description,
        price:          v.price,
        genre:          v.genre,
        isbn:           v.isbn,
        cover_url:      v.coverUrl,
        published_year: v.publishedYear,
        in_stock:       v.inStock,
      })
      return redirect(routes.admin.books.show.href({ bookId: params.bookId }))
    },

    async destroy({ get, params }: RequestContext<{ bookId: string }>) {
      const db = get(Database)
      await db.delete(books, Number(params.bookId))
      return redirect(routes.admin.books.index.href())
    },
  },
} satisfies Controller<typeof routes.admin.books>
