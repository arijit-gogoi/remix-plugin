import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { Document } from '../ui/document.tsx'

export function render(
  node: RemixNode,
  init: ResponseInit & { title?: string } = {},
): Response {
  const { title, ...rest } = init
  const stream = renderToStream(<Document title={title}>{node}</Document>)
  return new Response(stream, {
    ...rest,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...rest.headers,
    },
  })
}
