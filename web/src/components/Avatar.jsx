const COLORS = ['#0a0a0a', '#26262b', '#3f3f46', '#52525b', '#18181b', '#2e2e33']

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
