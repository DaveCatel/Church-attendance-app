// Helpers for proving a clock-in comes from a real phone at the church.

const DEVICE_KEY = 'attendance.device'

// A random id kept in this browser. The server links each clock-in to it, so one phone
// cannot check in two different people for the same service.
export function getDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_KEY)
    if (!token) {
      if (crypto.randomUUID) token = crypto.randomUUID()
      else token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(DEVICE_KEY, token)
    }
    return token
  } catch {
    return null // storage is blocked: the server will note that the phone was not identified
  }
}

// Asks the phone where it is. Resolves to null if the member says no, the phone cannot
// tell, or it takes too long. Never rejects: a missing location is flagged, not fatal.
export function getLocation({ timeoutMs = 12000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}
