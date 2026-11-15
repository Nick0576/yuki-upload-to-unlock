#!/usr/bin/env node
/**
 * Yuki server: serves the built app and proxies the two APIs so the secret
 * keys never reach the browser.
 *
 *   node server.mjs            # http://127.0.0.1:8787
 *   PORT=9000 node server.mjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'

/* ------------------------------------------------------------------ env */
function loadEnv() {
  const files = ['.env.local', '.env']
  for (const f of files) {
    const p = path.join(ROOT, f)
    if (!fs.existsSync(p)) continue
    for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      const k = line.slice(0, i).trim()
      let v = line.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!(k in process.env)) process.env[k] = v
    }
  }
}
loadEnv()

const NOMI_KEY = process.env.NOMI_API_KEY || ''
const NOMI_BASE = process.env.NOMI_BASE_URL || 'https://api.nomi.ai'
const KB_KEY = process.env.KOOLBASE_SECRET_KEY || process.env.KOOLBASE_API_KEY || ''
const KB_BASE = process.env.KOOLBASE_BASE_URL || 'https://api.koolbase.com'

/* ---------------------------------------------------------------- types */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('body_too_large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('bad_json'))
      }
    })
    req.on('error', reject)
  })
}

async function jsonFetch(url, opts = {}, timeoutMs = 60_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal })
    const text = await r.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }
    return { status: r.status, data }
  } finally {
    clearTimeout(t)
  }
}

/* ------------------------------------------------------------------ api */
async function api(req, res, url) {
  const route = url.pathname

  if (route === '/api/health') {
    return send(res, 200, {
      ok: true,
      nomi: Boolean(NOMI_KEY),
      koolbase: Boolean(KB_KEY),
      time: new Date().toISOString(),
    })
  }

  /* ---- Nomi ---- */
  if (route.startsWith('/api/nomi')) {
    if (!NOMI_KEY) {
      return send(res, 503, {
        error: 'nomi_not_configured',
        message: 'Set NOMI_API_KEY in .env on the server.',
      })
    }
    const auth = { Authorization: NOMI_KEY, 'Content-Type': 'application/json' }

    if (route === '/api/nomi/nomis' && req.method === 'GET') {
      const r = await jsonFetch(`${NOMI_BASE}/v1/nomis`, { headers: auth })
      return send(res, r.status, r.data)
    }

    if (route === '/api/nomi/chat' && req.method === 'POST') {
      const body = await readBody(req)
      let nomisId = body.nomisId
      if (!nomisId) {
        const list = await jsonFetch(`${NOMI_BASE}/v1/nomis`, { headers: auth })
        if (list.status !== 200) return send(res, list.status, list.data)
        const first = list.data?.nomis?.[0]
        if (!first) return send(res, 400, { error: 'no_nomi', message: 'No Nomi found on this account.' })
        nomisId = first.uuid
      }
      if (!body.messageText) return send(res, 400, { error: 'message_required' })

      const r = await jsonFetch(`${NOMI_BASE}/v1/nomis/${encodeURIComponent(nomisId)}/chat`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ messageText: String(body.messageText).slice(0, 4000) }),
      }, 90_000)
      if (r.status !== 200 && r.status !== 201) return send(res, r.status, r.data)

      const reply = r.data?.replyMessage?.text ?? r.data?.replyMessage?.messageText ?? ''
      return send(res, 200, {
        nomisId,
        text: String(reply).trim(),
        sent: r.data?.replyMessage?.sent ?? null,
        messageUuid: r.data?.replyMessage?.uuid ?? null,
      })
    }

    return send(res, 404, { error: 'not_found' })
  }

  /* ---- Koolbase auth ---- */
  if (route.startsWith('/api/auth')) {
    if (!KB_KEY) {
      return send(res, 503, {
        error: 'auth_not_configured',
        message: 'Set KOOLBASE_SECRET_KEY in .env, or use an offline account.',
      })
    }
    const headers = { 'x-api-key': KB_KEY, 'Content-Type': 'application/json' }
    const map = {
      '/api/auth/register': '/v1/sdk/auth/register',
      '/api/auth/login': '/v1/sdk/auth/login',
      '/api/auth/logout': '/v1/sdk/auth/logout',
      '/api/auth/forgot': '/v1/sdk/auth/forgot-password',
      '/api/auth/reset': '/v1/sdk/auth/reset-password',
      '/api/auth/verify-email': '/v1/sdk/auth/verify-email',
      '/api/auth/resend': '/v1/sdk/auth/send-verification',
    }

    if (route === '/api/auth/me' && req.method === 'GET') {
      const bearer = req.headers.authorization
      if (!bearer) return send(res, 401, { error: 'unauthorized' })
      const r = await jsonFetch(`${KB_BASE}/v1/sdk/auth/me`, {
        headers: { ...headers, Authorization: bearer },
      })
      return send(res, r.status, r.data)
    }

    const target = map[route]
    if (target && req.method === 'POST') {
      const body = await readBody(req)
      const r = await jsonFetch(`${KB_BASE}${target}`, {
        method: 'POST',
        headers: { ...headers, ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
        body: JSON.stringify(body),
      })
      return send(res, r.status, r.data)
    }

    return send(res, 404, { error: 'not_found' })
  }

  return send(res, 404, { error: 'not_found' })
}

/* --------------------------------------------------------------- static */
function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  const file = path.join(DIST, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''))

  if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden')

  const tryFile = (p) => {
    try {
      return fs.statSync(p).isFile() ? p : null
    } catch {
      return null
    }
  }

  const found = tryFile(file) || (!path.extname(file) ? tryFile(path.join(DIST, 'index.html')) : null)
  if (!found) return send(res, 404, 'Not found')

  const ext = path.extname(found).toLowerCase()
  const immutable = found.includes(`${path.sep}assets${path.sep}`) && ext !== '.html'
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=604800' : 'no-cache',
  })
  fs.createReadStream(found).pipe(res)
}

/* --------------------------------------------------------------- listen */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed')
    return serveStatic(req, res, url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[yuki]', req.method, url.pathname, msg)
    if (!res.headersSent) {
      send(res, 500, {
        error: 'server_error',
        message: msg === 'bad_json' ? 'Invalid JSON body.' : 'Something went wrong.',
      })
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Yuki running at http://${HOST}:${PORT}`)
  console.log(`  nomi key:      ${NOMI_KEY ? 'set' : 'MISSING'}`)
  console.log(`  koolbase key:  ${KB_KEY ? 'set' : 'MISSING (offline accounts still work)'}`)
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('  hint: run "npm run build" first')
  }
})
