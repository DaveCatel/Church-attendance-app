import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const sections = [
  {
    to: '/admin/services',
    number: '01',
    title: 'Services',
    description: 'Create services, update schedules, set attendance rules, and manage active services.',
    action: 'Manage services',
  },
  {
    to: '/admin/departments',
    number: '02',
    title: 'Departments',
    description: 'Create and edit church departments, and activate or deactivate them.',
    action: 'Manage departments',
  },
  {
    to: '/admin/requests',
    number: '03',
    title: 'Join requests',
    description: 'Review membership requests and approve or reject department applications.',
    action: 'Review requests',
    countKey: 'requests',
  },
  {
    to: '/admin/members',
    number: '04',
    title: 'Members',
    description: 'Find members and manage member accounts and access.',
    action: 'Manage members',
  },
  {
    to: '/admin/attendance',
    number: '05',
    title: 'Attendance records',
    description: 'Browse attendance by service and date, and review attendance reports.',
    action: 'View attendance',
  },
  {
    to: '/admin/checkin',
    number: '06',
    title: 'Check-in & verification',
    description: 'Open check-in tools, manage church location settings, and review flagged check-ins.',
    action: 'Open check-in tools',
    countKey: 'checkin',
  },
]

export default function Admin() {
  const [counts, setCounts] = useState({ requests: 0, checkin: 0 })

  useEffect(() => {
    api('/departments/memberships/pending')
      .then((items) => setCounts((current) => ({ ...current, requests: items.length })))
      .catch(() => {})
    api('/checkin/review/count')
      .then((result) => setCounts((current) => ({ ...current, checkin: result.count || 0 })))
      .catch(() => {})
  }, [])

  return (
    <section className="admin-home">
      <div className="admin-page-heading">
        <p className="eyebrow">CHURCH MANAGEMENT</p>
        <h1>Admin dashboard</h1>
        <p className="muted">Choose an area to manage. Each section has its own page and tools.</p>
      </div>

      <div className="admin-section-grid">
        {sections.map((section) => (
          <Link className="admin-section-card" to={section.to} key={section.to}>
            <div className="admin-section-card-top">
              <span className="admin-section-number">{section.number}</span>
              {section.countKey && counts[section.countKey] > 0 && (
                <span className="admin-count-badge">
                  {counts[section.countKey]} {section.countKey === 'requests' ? 'pending' : 'to review'}
                </span>
              )}
            </div>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span className="admin-card-action">{section.action} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
    </section>
  )
}
