import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

import { permissionsFor } from './permissions.ts'

function handler(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
): void {
  if (req.url !== '/api/permissions' || req.method !== 'POST') return next()

  let body = ''
  req.on('data', (chunk: Buffer) => (body += chunk.toString()))
  req.on('end', () => {
    const { pageKey } = JSON.parse(body || '{}') as { pageKey?: string }
    const role = String(req.headers['x-role'] ?? 'viewer')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(permissionsFor(role, pageKey ?? '')))
  })
}

/** Serves POST /api/permissions in dev and preview servers. */
export function mockPermissionsApi(): Plugin {
  return {
    name: 'mock-permissions-api',
    configureServer: (server) => void server.middlewares.use(handler),
    configurePreviewServer: (server) => void server.middlewares.use(handler)
  }
}
