import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import Avatar from './Avatar.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <strong className="brand">Church Attendance</strong>
          <nav>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/profile">Profile</NavLink>
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          <div className="topbar-user">
            <Avatar user={user} size={32} />
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  )
}
