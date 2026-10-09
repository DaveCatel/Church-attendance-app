import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../api'

export default function DepartmentsPage() {
  const location = useLocation()
  const [departments, setDepartments] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')

  const load = useCallback(async () => {
    setError('')
    try { setDepartments(await api('/departments/admin')) }
    catch (e) { setError(e.message); setDepartments([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => (departments || []).filter((d) => {
    const matchesQuery = `${d.name || ''} ${d.description || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStatus = status === 'all' || (status === 'active' ? d.is_active : !d.is_active)
    return matchesQuery && matchesStatus
  }), [departments, query, status])

  async function toggle(department) {
    setBusyId(String(department.id)); setError(''); setNotice('')
    try {
      await api(`/departments/${department.id}`, { method: 'PATCH', body: { is_active: !department.is_active } })
      setNotice(`${department.name} ${department.is_active ? 'deactivated' : 'activated'} successfully.`)
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusyId('') }
  }

  return <section className="entity-manager">
    <div className="entity-toolbar">
      <div><p className="eyebrow">ORGANIZATION</p><h2>Departments directory</h2><p className="muted">Manage church teams and control which departments members can join.</p></div>
      <Link className="btn btn-primary" to="/admin/departments/new">+ Create department</Link>
    </div>
    {notice && <p className="service-notice" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="entity-stats">
      <div className="services-stat"><span className="muted">Total departments</span><strong>{departments?.length ?? '—'}</strong></div>
      <div className="services-stat"><span className="muted">Active</span><strong>{departments?.filter(d => d.is_active).length ?? '—'}</strong></div>
      <div className="services-stat"><span className="muted">Inactive</span><strong>{departments?.filter(d => !d.is_active).length ?? '—'}</strong></div>
    </div>
    <div className="services-filters entity-filters">
      <label>Search departments<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or description" /></label>
      <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All departments</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></label>
    </div>
    {departments === null ? <p className="card muted">Loading departments…</p> : shown.length === 0 ? <div className="card service-empty"><span className="service-empty-icon" aria-hidden="true">▤</span><h3>{departments.length ? 'No matching departments' : 'No departments yet'}</h3><p className="muted">{departments.length ? 'Try another search or status filter.' : 'Create your first department to organize church members.'}</p>{!departments.length && <Link className="btn btn-primary" to="/admin/departments/new">Create department</Link>}</div> :
      <div className="entity-list">{shown.map(d => <article className={`entity-card ${d.is_active ? '' : 'is-inactive'}`} key={d.id}>
        <div className="entity-card-main"><div className="service-card-title-row"><h3>{d.name}</h3><span className={`service-status-pill ${d.is_active ? 'is-active' : 'is-inactive'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></div><p className="service-description">{d.description || 'No description provided.'}</p></div>
        <div className="entity-card-actions"><Link className="btn btn-ghost" to={`/admin/departments/${d.id}/edit`}>Edit details</Link><button className="btn" type="button" disabled={busyId === String(d.id)} onClick={() => toggle(d)}>{busyId === String(d.id) ? 'Updating…' : d.is_active ? 'Deactivate' : 'Activate'}</button></div>
      </article>)}</div>}
  </section>
}
