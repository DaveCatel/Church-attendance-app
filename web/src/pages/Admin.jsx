import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import ServicesTab from './admin/ServicesTab.jsx'
import RequestsTab from './admin/RequestsTab.jsx'
import MembersTab from './admin/MembersTab.jsx'
import CheckInTab from './admin/CheckInTab.jsx'
import AttendanceTab from './admin/AttendanceTab.jsx'

function DepartmentsTab() {
  const [departments, setDepartments] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('/departments/admin')
      .then(setDepartments)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(load, [load])

  async function create(e) {
    e.preventDefault()

    if (!name.trim()) return

    setBusy(true)
    setError('')

    try {
      await api('/departments', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || null,
        },
      })

      setName('')
      setDescription('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editing.name.trim()) return

    setBusy(true)
    setError('')

    try {
      await api(`/departments/${editing.id}`, {
        method: 'PATCH',
        body: {
          name: editing.name.trim(),
          description: editing.description?.trim() || null,
        },
      })

      setEditing(null)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(department) {
    setError('')

    try {
      await api(`/departments/${department.id}`, {
        method: 'PATCH',
        body: {
          is_active: !department.is_active,
        },
      })

      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <form className="card" onSubmit={create}>
        <h3>Create department</h3>

        <label>
          Department name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choir"
            required
          />
        </label>

        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Church choir department"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button
          className="btn btn-primary"
          disabled={busy}
        >
          {busy ? 'Creating…' : 'Create department'}
        </button>
      </form>

      <h2>Departments</h2>

      {departments && departments.length === 0 && (
        <p className="card muted">
          No departments created yet.
        </p>
      )}

      {departments && departments.length > 0 && (
        <ul className="card list">
          {departments.map((department) => (
            <li
              key={department.id}
              className={department.is_active ? '' : 'inactive'}
            >
              {editing?.id === department.id ? (
                <div className="stack">
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        name: e.target.value,
                      })
                    }
                  />

                  <input
                    value={editing.description || ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        description: e.target.value,
                      })
                    }
                  />

                  <div className="row">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={saveEdit}
                      disabled={busy}
                    >
                      Save
                    </button>

                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>
                    <strong>{department.name}</strong>

                    {department.description && (
                      <span className="muted">
                        {' · '}
                        {department.description}
                      </span>
                    )}

                    {!department.is_active && (
                      <span className="muted">
                        {' · Inactive'}
                      </span>
                    )}
                  </span>

                  <span className="row">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: department.id,
                          name: department.name,
                          description: department.description || '',
                        })
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => toggle(department)}
                    >
                      {department.is_active
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('services')
  const [pending, setPending] = useState([])
  const [reviewCount, setReviewCount] = useState(0)

  const loadPending = useCallback(() => {
    api('/departments/memberships/pending')
      .then(setPending)
      .catch(() => {})
  }, [])
  useEffect(loadPending, [loadPending])

  const loadReviewCount = useCallback(() => {
    api('/checkin/review/count')
      .then((r) => setReviewCount(r.count))
      .catch(() => {})
  }, [])
  useEffect(loadReviewCount, [loadReviewCount])

  const tabs = [
    ['services', 'Services'],
    ['departments', 'Departments'],
    ['requests', pending.length ? `Join requests (${pending.length})` : 'Join requests'],
    ['members', 'Members'],
    ['attendance', 'Attendance'],
    ['checkin', reviewCount ? `Check-in (${reviewCount})` : 'Check-in'],
  ]

  return (
    <>
      <h1>Admin</h1>
      <div className="tabs wrap">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'services' && <ServicesTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'requests' && <RequestsTab requests={pending} onChange={loadPending} />}
      {tab === 'members' && <MembersTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'checkin' && <CheckInTab onChange={loadReviewCount} />}
    </>
  )
}
