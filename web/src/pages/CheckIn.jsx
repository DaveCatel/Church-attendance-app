import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ServiceCard from '../components/ServiceCard.jsx'

// Where the QR code on the church screen leads: /checkin?o=<service session>&code=<code>.
// If the member is not signed in they sign in first and come back here.
export default function CheckIn() {
  const [params] = useSearchParams()
  const occurrenceId = params.get('o')
  const code = params.get('code') || ''
  const [card, setCard] = useState(undefined) // undefined = loading, null = not found
  const [error, setError] = useState('')

  useEffect(() => {
    sessionStorage.removeItem('attendance.next') // we are where the sign-in was heading
    api('/attendance/today')
      .then((data) => {
        const all = [...data.today, ...data.upcoming]
        setCard(all.find((s) => s.occurrence_id === occurrenceId) || null)
      })
      .catch((e) => setError(e.message))
  }, [occurrenceId])

  return (
    <>
      <h1>Check in</h1>
      {error && <p className="error">{error}</p>}
      {card === undefined && !error && <p className="muted">Finding your service…</p>}
      {card === null && (
        <p className="card muted">
          We could not find that service. It may have ended, been cancelled, or not be open to you. <Link to="/">Go to your services</Link>
        </p>
      )}
      {card && (
        <>
          <ServiceCard service={card} onChange={setCard} autoCode={code} />
          {card.state === 'clocked_in' && (
            <p className="muted small">
              You are checked in. <Link to="/">Back to home</Link>
            </p>
          )}
        </>
      )}
    </>
  )
}
