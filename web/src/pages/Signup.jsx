import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', department_ids: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  useEffect(() => {
    api('/departments', { noRefresh: true })
      .then(setDepartments)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDepartments(false))
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function toggleDepartment(id) {
    setForm((current) => ({
      ...current,
      department_ids: current.department_ids.includes(id)
        ? current.department_ids.filter((value) => value !== id)
        : [...current.department_ids, id],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signup(form)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <label>
          Full name
          <input value={form.full_name} onChange={set('full_name')} autoComplete="name" required minLength={2} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label>
          Phone
          <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+237 6XX XXX XXX" required />
        </label>
        <label>
          Departments
          <span className="muted small">
            Optional. Select every department you belong to; an admin will confirm each one.
          </span>
          {loadingDepartments ? (
            <span className="muted small">Loading departments…</span>
          ) : departments.length === 0 ? (
            <span className="muted small">No departments have been set up yet. You can ask to join one later from your profile.</span>
          ) : (
            <div className="check-list">
              {departments.map((department) => (
                <label className="check-item" key={department.id}>
                  <input
                    type="checkbox"
                    checked={form.department_ids.includes(department.id)}
                    onChange={() => toggleDepartment(department.id)}
                  />
                  <span>{department.name}</span>
                </label>
              ))}
            </div>
          )}
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={8} />
          <span className="muted small">At least 8 characters</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
        <p className="muted small">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
