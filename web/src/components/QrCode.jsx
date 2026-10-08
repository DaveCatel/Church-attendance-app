import { useMemo } from 'react'
import { qrMatrix } from '../lib/qr.js'

// Draws a QR code as an SVG. Always black on white with a quiet border, whatever the
// page theme, because that is what phone cameras read best.
export default function QrCode({ value, size = 280, label = 'QR code' }) {
  const { path, total } = useMemo(() => {
    const rows = qrMatrix(value)
    const n = rows.length
    const quiet = 4
    const parts = []
    rows.forEach((row, r) => {
      let c = 0
      while (c < n) {
        if (!row[c]) {
          c++
          continue
        }
        const start = c
        while (c < n && row[c]) c++
        parts.push(`M${start + quiet} ${r + quiet}h${c - start}v1h-${c - start}z`) // a run of dark modules
      }
    })
    return { path: parts.join(''), total: n + quiet * 2 }
  }, [value])

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${total} ${total}`} width={size} height={size} shapeRendering="crispEdges">
      <rect width={total} height={total} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
