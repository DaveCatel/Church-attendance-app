import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth.jsx'
import Avatar from '../components/Avatar.jsx'
import ServiceCard from '../components/ServiceCard.jsx'
import { dayLabel, greeting, time, todayLong } from '../format'

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
