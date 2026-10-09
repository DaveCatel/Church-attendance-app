import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, new_password: password } })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-logo" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1>Choose a new password</h1>

        {!token ? (
          <>
            <p className="error">This link is incomplete. Open the link from your email again, or request a new one.</p>
            <Link className="btn btn-big" to="/forgot-password">Request a new link</Link>
          </>
        ) : done ? (
          <>
            <p className="success">Your password has been changed. You can now sign in.</p>
            <Link className="btn btn-primary btn-big" to="/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">Pick a password you have not used before.</p>
            <label>
              New password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              <span className="muted small">At least 8 characters</span>
            </label>
            <label>
              Repeat the new password
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary btn-big" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
            <p className="muted small" style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/forgot-password">Request a new link</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}