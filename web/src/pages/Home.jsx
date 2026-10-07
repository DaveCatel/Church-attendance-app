import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import Avatar from '../components/Avatar.jsx'
import { dayLabel, greeting, time, todayLong } from '../format'

function ServiceCard({ service: s, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act() {
    setBusy(true)
    setError('')
    try {
      const path = s.state === 'clocked_in' ? '/attendance/clock-out' : '/attendance/clock-in'
      const updated = await api(path, {
        method: 'POST',
        body: { occurrence_id: s.occurrence_id, device_time: new Date().toISOString() },
      })
      onChange(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const range = s.end_time ? `${time(s.start_time)} – ${time(s.end_time)}` : time(s.start_time)

  return (
    <article className="card service">
      <div className="service-head">
        <div>
          <h3>{s.name}</h3>
          <p className="muted">{range}</p>
          {s.description && <p className="small">{s.description}</p>}
        </div>
        <span className={`badge badge-${s.state}`}>{BADGE[s.state]}</span>
      </div>

      {s.state === 'open' && (
        <button className="btn btn-primary btn-big" onClick={act} disabled={busy}>
          {busy ? 'Clocking in…' : 'Clock in'}
        </button>
      )}
      {s.state === 'clocked_in' && (
        <>
          <p className="small">You clocked in at <strong>{time(s.clock_in)}</strong></p>
          <button className="btn btn-danger btn-big" onClick={act} disabled={busy}>
            {busy ? 'Clocking out…' : 'Clock out'}
          </button>
        </>
      )}
      {s.state === 'completed' && (
        <p className="small">
          Thank you for attending. In <strong>{time(s.clock_in)}</strong> · out <strong>{time(s.clock_out)}</strong>
        </p>
      )}
      {s.state === 'upcoming' && (
        <button className="btn btn-big" disabled>Clock-in opens at {time(s.opens_at)}</button>
      )}
      {s.state === 'missed' && <p className="muted small">This service has ended and you did not clock in.</p>}
      {error && <p className="error">{error}</p>}
    </article>
  )
}

const BADGE = {
  upcoming: 'Later today',
  open: 'Open',
  clocked_in: 'Clocked in',
  completed: 'Attended',
  missed: 'Missed',
}

export default function Home() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api('/attendance/today')
      .then((d) => {
        setData(d)
        setError('')
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // pick up "clock-in opens" without a manual refresh
    return () => clearInterval(id)
  }, [load])

  const replace = (updated) =>
    setData((d) => ({
      ...d,
      today: d.today.map((s) => (s.occurrence_id === updated.occurrence_id ? updated : s)),
    }))

  return (
    <>
      <section className="hello">
        <Avatar user={user} size={56} />
        <div>
          <h1>{greeting()}, {user.full_name.split(' ')[0]}</h1>
          <p className="muted">{todayLong()}</p>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading services…</p>}

      {data && (
        <>
          <h2>Today</h2>
          {data.today.length === 0 && <p className="card muted">No service is scheduled for today.</p>}
          {data.today.map((s) => (
            <ServiceCard key={s.occurrence_id} service={s} onChange={replace} />
          ))}

          {data.upcoming.length > 0 && (
            <>
              <h2>Coming up</h2>
              <ul className="card list">
                {data.upcoming.map((s) => (
                  <li key={s.occurrence_id}>
                    <span><strong>{s.name}</strong></span>
                    <span className="muted">{dayLabel(s.service_date)} · {time(s.start_time)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  )
}
