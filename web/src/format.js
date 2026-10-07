// Everything is shown in the church's timezone (set from the signed-in user),
// so people see the same clock times no matter where their browser is.
let tz

export const setTimezone = (zone) => {
  tz = zone
}

export const time = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz })

// service_date comes as "YYYY-MM-DD"; parse as a plain calendar date to avoid a timezone shift
export const dayLabel = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

export const todayLong = () =>
  new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })

export const greeting = () => {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date()),
  )
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// "YYYY-MM-DD" for today in the church's timezone (what the date inputs and API expect)
export const todayYMD = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

// calendar-date arithmetic on "YYYY-MM-DD" strings
export const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// like dayLabel but with the year, for looking back at past services
export const dayLabelYear = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const dateShort = (iso) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz })
