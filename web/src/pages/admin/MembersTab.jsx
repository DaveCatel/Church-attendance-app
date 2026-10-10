import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth.jsx'
import { dateShort, dayLabelYear } from '../../format'

const PAGE = 50
const DEPT_STATUS = {
  ACTIVE: '',
  PENDING: ' · waiting for approval',
  REJECTED: ' · not approved',
}

function initials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

function MemberPanel({ member, departments, isSelf, onChange }) {
  const initial = {
    full_name: member.full_name || '',
    email: member.email || '',
    phone: member.phone || '',
    is_admin: member.role === 'admin',
    is_active: Boolean(member.is_active),
  }
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  async function run(label, fn) {
    setBusy(label)
    setError('')
    setNote('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy('')
    }
  }

  const save = (e) => {
    e.preventDefault()
    const body = {}
    if (f.full_name.trim() !== initial.full_name) body.full_name = f.full_name.trim()
    if (f.email.trim() !== initial.email) body.email = f.email.trim()
    if (f.phone.trim() !== initial.phone) body.phone = f.phone.trim()
    if (f.is_admin !== initial.is_admin) body.role = f.is_admin ? 'admin' : 'member'
    if (f.is_active !== initial.is_active) body.is_active = f.is_active
    if (!Object.keys(body).length) {
      setNote('No changes to save.')
      return
    }
    run('save', async () => {
      const updated = await api(`/members/${member.id}`, { method: 'PATCH', body })
      onChange(updated)
      setNote('Member details saved successfully.')
    })
  }

  const membership = (id) => (member.departments || []).find((d) => String(d.department_id) === String(id))
  const toggleDepartment = (dept) => run(`dept-${dept.id}`, async () => {
    const current = membership(dept.id)
    const updated = current?.status === 'ACTIVE'
      ? await api(`/members/${member.id}/departments/${dept.id}`, { method: 'DELETE' })
      : await api(`/members/${member.id}/departments/${dept.id}`, { method: 'PUT', body: { status: 'ACTIVE' } })
    if (updated) onChange(updated)
    else {
      const refreshed = await api(`/members?limit=1&offset=0&q=${encodeURIComponent(member.email || member.full_name)}`)
      const found = refreshed.items?.find((item) => item.id === member.id)
      if (found) onChange(found)
      else setNote('Department updated. Close and reopen this member to refresh their department list.')
    }
  })

  const setTemporaryPassword = (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Use at least 8 characters for the temporary password.')
      return
    }
    run('password', async () => {
      await api(`/members/${member.id}/password`, { method: 'POST', body: { new_password: password } })
      setPassword('')
      setShowPassword(false)
      setNote('Password changed. Share it securely with the member and ask them to change it after signing in.')
    })
  }

  return (
    <div className="member-panel">
      <div className="member-history-grid">
        <div><span>Attendance</span><strong>{member.times_attended ?? 0}</strong></div>
        <div><span>Last attended</span><strong>{member.last_attended ? dayLabelYear(member.last_attended) : 'No record'}</strong></div>
        <div><span>Joined</span><strong>{member.created_at ? dateShort(member.created_at) : '—'}</strong></div>
        <div><span>Last sign-in</span><strong>{member.last_login_at ? dateShort(member.last_login_at) : 'Never'}</strong></div>
      </div>

      <form onSubmit={save} className="member-edit-form">
        <h4>Account details</h4>
        <label>Full name<input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></label>
        <div className="row">
          <label>Email address<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label>Phone number<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        </div>
        <div className="member-permissions">
          <label className="check-item">
            <input type="checkbox" checked={f.is_admin} disabled={isSelf || Boolean(busy)} onChange={(e) => setF({ ...f, is_admin: e.target.checked })} />
            <span><strong>Administrator access</strong><small>Can manage church services, members and attendance.</small></span>
          </label>
          <label className="check-item">
            <input type="checkbox" checked={f.is_active} disabled={isSelf || Boolean(busy)} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
            <span><strong>Active account</strong><small>Inactive members cannot sign in. Their attendance history is retained.</small></span>
          </label>
        </div>
        {isSelf && <p className="muted small">For safety, you cannot remove your own administrator access or deactivate your own account here.</p>}
        <div className="actions"><button className="btn btn-primary" disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save account changes'}</button></div>
      </form>

      <fieldset className="who member-department-fieldset">
        <legend>Department membership</legend>
        <p className="muted small">Select the departments this member belongs to.</p>
        {departments.length === 0 && <span className="muted small">No active departments available.</span>}
        {departments.map((d) => {
          const m = membership(d.id)
          return <label className="check-item" key={d.id}>
            <input type="checkbox" checked={m?.status === 'ACTIVE'} disabled={Boolean(busy)} onChange={() => toggleDepartment(d)} />
            <span>{d.name}<small className="muted">{m ? DEPT_STATUS[m.status] || '' : ''}</small></span>
            {busy === `dept-${d.id}` && <small className="muted">Updating…</small>}
          </label>
        })}
      </fieldset>

      <div className="member-password-tools">
        <div><strong>Password support</strong><p className="muted small">Set a temporary password if a member cannot access their account.</p></div>
        {!showPassword && <button className="btn btn-ghost" type="button" onClick={() => { setError(''); setShowPassword(true) }}>Set temporary password</button>}
        {showPassword && <form className="member-password-form" onSubmit={setTemporaryPassword}>
          <label>Temporary password<input type="password" value={password} placeholder="At least 8 characters" onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
          <div className="actions"><button className="btn btn-primary" disabled={busy === 'password'}>{busy === 'password' ? 'Updating…' : 'Set password'}</button><button className="btn btn-ghost" type="button" onClick={() => { setShowPassword(false); setPassword('') }}>Cancel</button></div>
        </form>}
      </div>
      {error && <p className="error member-feedback" role="alert">{error}</p>}
      {note && <p className="success member-feedback" role="status">{note}</p>}
    </div>
  )
}

export default function MembersTab() {
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [filter, setFilter] = useState('all')
  const [departments, setDepartments] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const latest = useRef(0)

  useEffect(() => {
    api('/departments/admin').then((list) => setDepartments(list.filter((d) => d.is_active))).catch(() => {})
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 250)
    return () => clearTimeout(timer)
  }, [q])

  const query = useCallback((offset) => {
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
    if (search.trim()) params.set('q', search.trim())
    if (dept) params.set('department_id', dept)
    if (filter === 'admin') params.set('role', 'admin')
    if (filter === 'inactive') params.set('active', 'false')
    return `/members?${params.toString()}`
  }, [search, dept, filter])

  useEffect(() => {
    const id = ++latest.current
    setLoading(true)
    setLoadingMore(false)
    setError('')
    api(query(0)).then((res) => {
      if (id !== latest.current) return
      setItems(res.items || [])
      setTotal(res.total || 0)
      setOpenId(null)
    }).catch((e) => {
      if (id === latest.current) setError(e.message || 'Could not load members.')
    }).finally(() => {
      if (id === latest.current) setLoading(false)
    })
    return () => { if (latest.current === id) latest.current += 1 }
  }, [query])

  async function loadMore() {
    const id = ++latest.current
    setLoadingMore(true)
    setError('')
    try {
      const res = await api(query(items.length))
      if (id !== latest.current) return
      setItems((current) => [...current, ...(res.items || [])])
      setTotal(res.total || 0)
    } catch (e) {
      if (id === latest.current) setError(e.message || 'Could not load more members.')
    } finally {
      if (id === latest.current) setLoadingMore(false)
    }
  }

  const replace = (updated) => setItems((current) => current.map((m) => (m.id === updated.id ? updated : m)))
  const visibleStats = useMemo(() => ({
    admins: items.filter((m) => m.role === 'admin').length,
    inactive: items.filter((m) => !m.is_active).length,
  }), [items])
  const clearFilters = () => { setQ(''); setDept(''); setFilter('all') }
  const hasFilters = Boolean(q.trim() || dept || filter !== 'all')

  return <div className="members-directory">
    <section className="members-overview-grid" aria-label="Member overview">
      <div className="members-overview-card"><span className="members-overview-icon">◎</span><div><span>Total matching members</span><strong>{loading ? '—' : total}</strong></div></div>
      <div className="members-overview-card"><span className="members-overview-icon">♙</span><div><span>Admins in loaded results</span><strong>{visibleStats.admins}</strong></div></div>
      <div className="members-overview-card"><span className="members-overview-icon">◌</span><div><span>Inactive in loaded results</span><strong>{visibleStats.inactive}</strong></div></div>
    </section>

    <section className="card members-filter-card">
      <div className="members-filter-heading"><div><h3>Member directory</h3><p className="muted small">Find a member, review their status, and manage their account.</p></div><span className="members-total-pill">{loading ? 'Updating…' : `${total} ${total === 1 ? 'member' : 'members'}`}</span></div>
      <label className="member-search-label">Search members
        <span className="member-search-box"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone…" /><button type="button" onClick={() => setQ('')} aria-label="Clear search" hidden={!q}>×</button></span>
      </label>
      <div className="members-filter-row"><div><span className="filter-caption">Account status</span><div className="tabs wrap member-status-tabs">
        {[['all', 'Everyone'], ['admin', 'Administrators'], ['inactive', 'Inactive']].map(([key, label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>)}
      </div></div>
      {departments.length > 0 && <label className="member-department-select">Department<select value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      </div>
      {hasFilters && <div className="members-filter-footer"><span className="muted small">Filters are applied automatically.</span><button type="button" className="text-button" onClick={clearFilters}>Clear all filters</button></div>}
    </section>

    {error && <div className="member-error-banner" role="alert"><div><strong>We couldn’t complete that request</strong><p>{error}</p></div><button className="btn btn-ghost" onClick={() => { setSearch(q); setError('') }}>Dismiss</button></div>}
    {loading && items.length === 0 && <div className="card members-empty-state"><span className="members-empty-icon">◌</span><strong>Loading member directory…</strong><p className="muted small">Please wait while we retrieve the member records.</p></div>}
    {!loading && items.length === 0 && !error && <div className="card members-empty-state"><span className="members-empty-icon">⌕</span><strong>{hasFilters ? 'No matching members' : 'No members yet'}</strong><p className="muted small">{hasFilters ? 'Try a different search or clear some filters.' : 'Members will appear here when accounts are registered.'}</p>{hasFilters && <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>}</div>}

    {items.length > 0 && <section className="members-results" aria-label="Member results">
      <div className="members-results-heading"><div><h3>Member accounts</h3><p className="muted small">Select a member to view and edit their details.</p></div><span className="muted small">Showing {items.length} of {total}</span></div>
      <div className="members-list">
        {items.map((m) => {
          const expanded = openId === m.id
          const activeDepartments = (m.departments || []).filter((d) => d.status === 'ACTIVE')
          const pendingDepartments = (m.departments || []).filter((d) => d.status === 'PENDING')
          return <article key={m.id} className={`member-card ${expanded ? 'is-expanded' : ''} ${!m.is_active ? 'is-inactive' : ''}`}>
            <button type="button" className="member-card-summary" onClick={() => setOpenId(expanded ? null : m.id)} aria-expanded={expanded}>
              <span className="member-avatar" aria-hidden="true">{initials(m.full_name)}</span>
              <span className="member-primary-info"><span className="member-name-line"><strong>{m.full_name || 'Unnamed member'}</strong>{m.role === 'admin' && <span className="badge">Admin</span>}{!m.is_active && <span className="badge badge-missed">Inactive</span>}</span><span className="member-contact-line">{m.email || 'No email provided'}{m.phone ? ` · ${m.phone}` : ''}</span><span className="member-mobile-meta">{activeDepartments.length} active {activeDepartments.length === 1 ? 'department' : 'departments'}{pendingDepartments.length ? ` · ${pendingDepartments.length} pending` : ''}</span></span>
              <span className="member-card-right"><span className="member-depts">{activeDepartments.slice(0, 3).map((d) => <span key={d.department_id} className="badge badge-open">{d.name}</span>)}{pendingDepartments.length > 0 && <span className="badge">{pendingDepartments.length} pending</span>}{activeDepartments.length > 3 && <span className="badge">+{activeDepartments.length - 3}</span>}{activeDepartments.length === 0 && pendingDepartments.length === 0 && <span className="muted small">No departments</span>}</span><span className={`member-expand-icon ${expanded ? 'expanded' : ''}`} aria-hidden="true">⌄</span></span>
            </button>
            {expanded && <MemberPanel key={m.id} member={m} departments={departments} isSelf={String(m.id) === String(me?.id)} onChange={replace} />}
          </article>
        })}
      </div>
    </section>}
    {items.length < total && <div className="members-load-more"><button className="btn" onClick={loadMore} disabled={loadingMore || loading}>{loadingMore ? 'Loading members…' : `Load more members (${total - items.length} remaining)`}</button></div>}
  </div>
}
