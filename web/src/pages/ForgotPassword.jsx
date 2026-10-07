import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } })
      setMessage(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Forgot your password?</h1>
        {message ? (
          <>
            <p>{message}</p>
            <p className="muted small">
              The link works for a limited time. If nothing arrives, check your spam folder, or ask a
              church admin to set a temporary password for you.
            </p>
          </>
        ) : (
          <>
            <p className="muted">Enter the email you signed up with and we will send you a link to choose a new password.</p>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </>
        )}
        <p className="muted small">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
