import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { ServiceForm } from './ServicesTab.jsx'

export default function ServiceEditor() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(serviceId)
  const [service, setService] = useState(null)
  const [departments, setDepartments] = useState([])
  const [locationSet, setLocationSet] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(!editing)

  useEffect(() => {
    let alive = true
    api('/departments/admin').then((items) => { if (alive) setDepartments(items) }).catch(() => {})
    api('/checkin/church-location').then((l) => { if (alive) setLocationSet(l.latitude != null) }).catch(() => {})
    if (editing) {
      api('/services').then((items) => {
        if (!alive) return
        const found = items.find((item) => String(item.id) === String(serviceId))
        if (found) setService(found)
        else setError('That service could not be found. It may have been deleted.')
      }).catch((e) => { if (alive) setError(e.message) }).finally(() => { if (alive) setReady(true) })
    }
    return () => { alive = false }
  }, [editing, serviceId])

  if (!editing && !ready) return <p className="muted">Loading…</p>
  if (editing && !ready) return <p className="muted">Loading service…</p>
  if (editing && !service && !error) return <Navigate to="/admin/services" replace />

  return (
    <section className="service-editor-page">
      <Link className="admin-back-link" to="/admin/services">← Back to services</Link>
      <div className="admin-page-heading">
        <p className="eyebrow">SERVICE MANAGEMENT</p>
        <h1>{editing ? 'Edit service' : 'Create a service'}</h1>
        <p className="muted">{editing ? 'Update the schedule, audience, and attendance verification settings.' : 'Set up a service, meeting, or event for your church members.'}</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {(!editing || service) && (
        <ServiceForm
          key={service?.id || 'new-service'}
          service={service || undefined}
          departments={departments}
          locationSet={locationSet}
          onSaved={() => navigate('/admin/services', { replace: true, state: { notice: editing ? 'Service changes saved successfully.' : 'Service created successfully.' } })}
          onCancel={() => navigate('/admin/services')}
        />
      )}
    </section>
  )
}
