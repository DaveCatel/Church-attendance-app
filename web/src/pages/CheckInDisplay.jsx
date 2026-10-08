import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import QrCode from '../components/QrCode.jsx'
import { dayLabelYear, time } from '../format'

// The full-screen page the admin puts on a projector or tablet at church. The code
// changes every 30 seconds, so a code sent to someone outside is dead within a minute.
export default function CheckInDisplay() {
  const { occurrenceId } = useParams()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [left, setLeft] = useState(0)
  const expiresAt = useRef(0)
  const loading = useRef(false)

  const load = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const res = await api(`/checkin/occurrences/${occurrenceId}/code`)
      expiresAt.current = Date.now() + res.seconds_left * 1000
      setInfo(res)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      loading.current = false
    }
  }, [occurrenceId])

  useEffect(() => {
    load()
    const poll = setInterval(load, 10000) // also keeps the "checked in" counter fresh
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt.current - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) load() // the code just changed: fetch the new one
    }, 500)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [load])

  const origin = window.location.origin
  const link = info ? `${origin}/checkin?o=${occurrenceId}&code=${info.code}` : ''
  const grouped = info ? `${info.code.slice(0, 3)} ${info.code.slice(3)}` : ''

  return (
    <main className="kiosk">
      <div className="kiosk-bar">
        <Link to="/admin" className="kiosk-link">← Admin</Link>
        <button className="kiosk-link" onClick={() => document.documentElement.requestFullscreen?.()}>Full screen</button>
      </div>

      {error && <p className="kiosk-error">{error}</p>}
      {!info && !error && <p className="kiosk-note">Loading…</p>}

      {info && (
        <>
          <h1 className="kiosk-title">{info.service_name}</h1>
          <p className="kiosk-sub">
            {dayLabelYear(info.service_date)} · {time(info.start_time)}
          </p>

          {info.verification_mode === 'NONE' ? (
            <p className="kiosk-note">
              This service does not use check-in codes, so members can clock in from their phones without one. To turn the
              code on, edit the service in Admin and set Check-in verification.
            </p>
          ) : (
            <div className="kiosk-main">
              <div className="kiosk-code">
                <p className="kiosk-label">Check-in code</p>
                <p className="kiosk-digits" aria-live="polite">{grouped}</p>
                <div className="kiosk-timer" aria-hidden="true">
                  <div style={{ width: `${Math.min(100, (left / info.window_seconds) * 100)}%` }} />
                </div>
                <p className="kiosk-small">New code in {left}s</p>
              </div>
              <div className="kiosk-qr">
                <QrCode value={link} size={320} label="Scan to check in" />
                <p className="kiosk-small">Scan with your phone's camera</p>
              </div>
            </div>
          )}

          <p className="kiosk-foot">
            Open <strong>{origin.replace(/^https?:\/\//, '')}</strong>, tap Clock in and type the code, or scan the QR code.
            <span className="kiosk-count"> {info.attendee_count} checked in</span>
          </p>
        </>
      )}
    </main>
  )
}
