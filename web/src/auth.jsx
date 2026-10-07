import { createContext, useContext, useEffect, useState } from 'react'
import { api, getRefreshToken, hasTokens, saveTokens } from './api'
import { setTimezone } from './format'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const setUser = (u) => {
    if (u) setTimezone(u.timezone)
    setUserState(u)
  }
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)

    if (!hasTokens()) {
      setReady(true)
    } else {
      api('/users/me')
        .then((u) => alive && setUser(u))
        .catch(() => saveTokens(null))
        .finally(() => alive && setReady(true))
    }
    return () => {
      alive = false
      window.removeEventListener('auth:expired', onExpired)
    }
  }, [])

  const start = (d) => {
    saveTokens({ access_token: d.access_token, refresh_token: d.refresh_token })
    setUser(d.user)
  }

  const login = async (identifier, password) =>
    start(await api('/auth/login', { method: 'POST', body: { identifier, password }, noRefresh: true }))

  const signup = async (data) =>
    start(await api('/auth/signup', { method: 'POST', body: data, noRefresh: true }))

  const logout = async () => {
    const refresh_token = getRefreshToken()
    try {
      if (refresh_token) await api('/auth/logout', { method: 'POST', body: { refresh_token }, noRefresh: true })
    } catch {
      /* ignore, we are leaving anyway */
    }
    saveTokens(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
