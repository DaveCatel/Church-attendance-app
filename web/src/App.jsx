import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import CheckIn from './pages/CheckIn.jsx'
import CheckInDisplay from './pages/CheckInDisplay.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'
import AdminSection from './pages/AdminSection.jsx'
import ServiceEditor from './pages/admin/ServiceEditor.jsx'
import DepartmentEditor from './pages/admin/DepartmentEditor.jsx'

function Protected({ adminOnly = false, bare = false }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <p className="center muted">Loading…</p>
  if (!user) {
    // someone who scanned the church QR code signs in first and then lands back on it
    if (location.pathname === '/checkin') {
      sessionStorage.setItem('attendance.next', location.pathname + location.search)
    }
    return <Navigate to="/login" replace />
  }
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  if (bare) return <Outlet />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="center muted">Loading…</p>
  return user ? <Navigate to={sessionStorage.getItem('attendance.next') || '/'} replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkin" element={<CheckIn />} />
      </Route>
      <Route element={<Protected adminOnly />}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/services/new" element={<ServiceEditor />} />
        <Route path="/admin/services/:serviceId/edit" element={<ServiceEditor />} />
        <Route path="/admin/departments/new" element={<DepartmentEditor />} />
        <Route path="/admin/departments/:departmentId/edit" element={<DepartmentEditor />} />
        <Route path="/admin/:section" element={<AdminSection />} />
      </Route>
      <Route element={<Protected adminOnly bare />}>
        <Route path="/checkin-display/:occurrenceId" element={<CheckInDisplay />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
