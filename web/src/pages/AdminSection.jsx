import { Link, Navigate, useParams } from 'react-router-dom'
import ServicesTab from './admin/ServicesTab.jsx'
import DepartmentsPage from './admin/DepartmentsPage.jsx'
import RequestsTab from './admin/RequestsTab.jsx'
import MembersTab from './admin/MembersTab.jsx'
import CheckInTab from './admin/CheckInTab.jsx'
import AttendanceTab from './admin/AttendanceTab.jsx'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'

const sectionLinks = [
  ['services', 'Services'], ['departments', 'Departments'], ['requests', 'Join requests'],
  ['members', 'Members'], ['attendance', 'Attendance'], ['checkin', 'Check-in'],
]

const sectionInfo = {
  services: { title: 'Services', description: 'Create and manage church services and their attendance settings.' },
  departments: { title: 'Departments', description: 'Organize church departments and manage their status.' },
  requests: { title: 'Department join requests', description: 'Review and respond to requests from members who want to join a department.' },
  members: { title: 'Members', description: 'Search for members and manage their accounts.' },
  attendance: { title: 'Attendance records', description: 'Review attendance sessions and member attendance over time.' },
  checkin: { title: 'Check-in & verification', description: 'Manage check-in tools, location settings, and check-in reviews.' },
}

export default function AdminSection() {
  const { section } = useParams()
  const [pending, setPending] = useState([])
  const [reviewCount, setReviewCount] = useState(0)
  const info = sectionInfo[section]

  const loadPending = useCallback(() => {
    api('/departments/memberships/pending').then(setPending).catch(() => {})
  }, [])
  const loadReviewCount = useCallback(() => {
    api('/checkin/review/count').then((result) => setReviewCount(result.count || 0)).catch(() => {})
  }, [])

  useEffect(() => {
    loadPending()
    loadReviewCount()
  }, [loadPending, loadReviewCount])

  if (!info) return <Navigate to="/admin" replace />

  return (
    <section className="admin-section-page">
      <Link className="admin-back-link" to="/admin">← Admin dashboard</Link>
      <nav className="admin-section-nav" aria-label="Admin sections">
        {sectionLinks.map(([key, label]) => <Link key={key} to={`/admin/${key}`} className={section === key ? 'is-current' : ''} aria-current={section === key ? 'page' : undefined}>{label}</Link>)}
      </nav>
      <div className="admin-page-heading">
        <p className="eyebrow">CHURCH MANAGEMENT</p>
        <h1>{info.title}</h1>
        <p className="muted">{info.description}</p>
      </div>

      <div className="admin-section-content">
        {section === 'services' && <ServicesTab />}
        {section === 'departments' && <DepartmentsPage />}
        {section === 'requests' && <RequestsTab requests={pending} onChange={loadPending} />}
        {section === 'members' && <MembersTab />}
        {section === 'attendance' && <AttendanceTab />}
        {section === 'checkin' && <CheckInTab onChange={loadReviewCount} />}
      </div>
    </section>
  )
}
