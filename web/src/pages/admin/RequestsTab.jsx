import { useState } from 'react'
import { api } from '../../api'
import { dateShort } from '../../format'

// People who picked a department when signing up wait here until an admin approves them.
export default function RequestsTab({ requests, onChange }) {
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')

  async function review(r, action) {
    setBusyKey(`${r.user_id}:${r.department_id}`)
    setError('')
    try {
      await api(`/departments/memberships/${r.user_id}/${r.department_id}/${action}`, { method: 'PATCH' })
      onChange()
    } catch (e) {
      setError(e.message)
      onChange() // someone else may have handled it already: refresh the list
    } finally {
      setBusyKey('')
    }
  }

  return (
    <>
      <h2>Department join requests</h2>
      {error && <p className="error">{error}</p>}
      {requests.length === 0 ? (
        <p className="card muted">No requests waiting for approval.</p>
      ) : (
        <ul className="card list">
          {requests.map((r) => {
            const key = `${r.user_id}:${r.department_id}`
            return (
              <li key={key}>
                <span>
                  <strong>{r.full_name}</strong>
                  <span className="muted"> wants to join </span>
                  <strong>{r.department_name}</strong>
                  <br />
                  <span className="muted small">
                    {[r.phone, r.email].filter(Boolean).join(' · ')} · requested {dateShort(r.joined_at)}
                  </span>
                </span>
                <span className="actions">
                  <button className="btn btn-primary" disabled={busyKey === key} onClick={() => review(r, 'approve')}>
                    Approve
                  </button>
                  <button className="btn" disabled={busyKey === key} onClick={() => review(r, 'reject')}>
                    Reject
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
