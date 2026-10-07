const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#dc2626']

export default function Avatar({ user, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (user.profile_photo_url) {
    return <img className="avatar" style={style} src={user.profile_photo_url} alt={user.full_name} />
  }
  const initials = user.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const color = COLORS[[...user.full_name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <span className="avatar" style={{ ...style, background: color }} aria-label={user.full_name}>
      {initials}
    </span>
  )
}
