import type { Handle, RemixNode } from 'remix/ui'

export function Document(handle: Handle<{ title?: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? 'Minimal Remix App'}</title>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; }
          main { max-width: 720px; margin: 0 auto; padding: 2rem; }
          h1   { font-size: 2.25rem; }
          a    { color: #0a66ff; }
        `}</style>
      </head>
      <body>{handle.props.children}</body>
    </html>
  )
}
