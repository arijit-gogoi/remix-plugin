import { del, form, get, post, put, resources, route } from 'remix/fetch-router/routes'

export const routes = route({
  // Static & shop
  home:  '/',
  about: '/about',

  // Public book browsing
  books: {
    index: '/books',
    show:  '/books/:slug',
  },

  // Session cart (no auth required)
  cart: route('cart', {
    index:  get('/'),
    api: {
      add:    post('/api/add'),
      remove: del('/api/remove'),
    },
  }),

  // Admin CRUD
  admin: route('admin', {
    index: get('/'),
    books: resources('books', { param: 'bookId' }),
  }),
})
