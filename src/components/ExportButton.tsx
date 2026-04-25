import { useState } from 'react'
import { useRouteStore } from '../store/useRouteStore'
import { useT } from '../hooks/useT'
import { buildGpx, downloadGpx } from '../utils/gpxExport'

export function ExportButton() {
  const waypoints = useRouteStore((s) => s.waypoints)
  const segments = useRouteStore((s) => s.segments)
  const [exported, setExported] = useState(false)
  const t = useT()

  function handleExport() {
    if (waypoints.length < 2) {
      alert(t.exportMin2)
      return
    }

    const gpx = buildGpx(waypoints, segments)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadGpx(gpx, `ruta-${timestamp}.gpx`)

    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <button
      onClick={handleExport}
      disabled={waypoints.length < 2}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl
        bg-trail-600 text-white text-sm font-semibold
        disabled:opacity-40 active:scale-95 transition-all min-h-[44px]
        shadow-sm shadow-trail-200"
    >
      {exported ? (
        <>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.exported}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
          </svg>
          {t.exportGpx}
        </>
      )}
    </button>
  )
}
