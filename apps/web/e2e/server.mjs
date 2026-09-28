import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

// Test-only static host: exercise real built workers without modifying dist.
const root = resolve('dist')
let version = 1
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1:4174').pathname
  response.setHeader('Cache-Control', 'no-store')
  if (path === '/__test/update' && request.method === 'POST') {
    version += 1
    response.end(String(version))
    return
  }
  if (path.startsWith('/api/') || path.startsWith('/auth/')) {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ privateRecord: 'test-only-private-value' }))
    return
  }
  const file = resolve(root, `.${path === '/' ? '/index.html' : path}`)
  if (!file.startsWith(root + sep)) {
    response.writeHead(403).end()
    return
  }
  try {
    const content = await readFile(file)
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
    response.end(path === '/sw.js' ? `${content}\n// test deploy ${version}\n` : content)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(4174, '127.0.0.1')
