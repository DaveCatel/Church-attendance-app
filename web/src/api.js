// Small fetch wrapper: adds the bearer token and transparently refreshes it once on 401.
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`

if (!BASE) {
  console.error('VITE_API_URL is not configured')
}
//const BASE = '/api'
const KEY = 'attendance.tokens'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

let tokens = load()

export const hasTokens = () => !!tokens
export const getRefreshToken = () => tokens?.refresh_token

export function saveTokens(t) {
  tokens = t
  if (t) localStorage.setItem(KEY, JSON.stringify(t))
  else localStorage.removeItem(KEY)
}

let refreshing = null
function refresh() {
  if (!tokens?.refresh_token) return Promise.resolve(false)
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    })
      .then(async (r) => {
        if (!r.ok) return false
        const d = await r.json()
        saveTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

function send(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return fetch(`${BASE}${path}`, { method, headers, body: payload })
}

async function errorMessage(res) {
  try {
    const data = await res.json()
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail[0]) {
      const field = data.detail[0].loc?.slice(-1)[0]
      const msg = String(data.detail[0].msg).replace(/^Value error, /, '')
      return field && field !== 'body' ? `${field}: ${msg}` : msg
    }
  } catch {
    /* not JSON */
  }
  return `Request failed (${res.status})`
}

export async function api(path, opts = {}) {
  let res
  try {
    res = await send(path, opts)
  } catch {
    throw new Error('Cannot reach the server. Check your connection.')
  }
  if (res.status === 401 && tokens?.refresh_token && !opts.noRefresh) {
    if (await refresh()) {
      res = await send(path, opts)
    } else {
      saveTokens(null)
      window.dispatchEvent(new Event('auth:expired'))
    }
  }
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.status === 204 ? null : res.json()
}
