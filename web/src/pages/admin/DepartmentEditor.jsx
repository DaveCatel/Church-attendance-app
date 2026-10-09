import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'

export default function DepartmentEditor() {
  const { departmentId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(departmentId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    let alive = true
    api('/departments/admin').then(items => {
      if (!alive) return
      const d = items.find(item => String(item.id) === String(departmentId))
      if (!d) setError('Department not found. It may have been removed.')
      else { setName(d.name || ''); setDescription(d.description || ''); setActive(Boolean(d.is_active)) }
    }).catch(e => { if (alive) setError(e.message) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [editing, departmentId])

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!name.trim()) return setError('Enter a department name.')
    setBusy(true)
    try {
      const body = { name: name.trim(), description: description.trim() || null }
      if (editing) body.is_active = active
      await api(editing ? `/departments/${departmentId}` : '/departments', { method: editing ? 'PATCH' : 'POST', body })
      navigate('/admin/departments', { replace: true, state: { notice: editing ? 'Department updated successfully.' : 'Department created successfully.' } })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  return <section className="service-editor-page entity-editor-page">
    <Link className="admin-back-link" to="/admin/departments">← Back to departments</Link>
    <div className="admin-page-heading"><p className="eyebrow">DEPARTMENT MANAGEMENT</p><h1>{editing ? 'Edit department' : 'Create department'}</h1><p className="muted">{editing ? 'Update department details and availability.' : 'Add a church department so members can request to join it.'}</p></div>
    {loading ? <p className="muted">Loading department…</p> : <form className="card entity-form" onSubmit={submit}>
      <label>Department name<input value={name} onChange={e => setName(e.target.value)} placeholder="Choir, Media, Ushering…" required maxLength={100} /></label>
      <label>Description <span className="muted small">(optional)</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe this department" rows={4} maxLength={500} /></label>
      {editing && <label className="check-item"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /><span>Department is active and available for membership</span></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="entity-form-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create department'}</button><Link className="btn btn-ghost" to="/admin/departments">Cancel</Link></div>
    </form>}
  </section>
}
