import type { Waypoint, RouteSegment } from '../types'

/**
 * Convierte waypoints y segmentos en un string GPX válido.
 * Incluye trk/trkseg con los puntos de la polilínea real (snap-to-road).
 */
export function buildGpx(
  waypoints: Waypoint[],
  segments: RouteSegment[],
  name = 'GPX Mapper Route',
): string {
  const now = new Date().toISOString()

  // Construir todos los puntos de la pista a partir de los segmentos
  const trkPoints: Array<{ lat: number; lng: number; ele?: number }> = []

  if (segments.length > 0) {
    segments.forEach((seg, si) => {
      seg.points.forEach((pt, pi) => {
        // Evitar duplicar el último punto de un segmento con el primero del siguiente
        if (si > 0 && pi === 0) return
        const ptAny = pt as typeof pt & { ele?: number }
        trkPoints.push({ lat: pt.lat, lng: pt.lng, ele: ptAny.ele })
      })
    })
  } else {
    // Sin segmentos: exportar solo waypoints como pista
    waypoints.forEach((w) => trkPoints.push({ lat: w.latlng.lat, lng: w.latlng.lng }))
  }

  const trkptXml = trkPoints
    .map((pt) => {
      const eleTag = pt.ele != null ? `\n        <ele>${pt.ele.toFixed(1)}</ele>` : ''
      return `      <trkpt lat="${pt.lat.toFixed(7)}" lon="${pt.lng.toFixed(7)}">${eleTag}\n      </trkpt>`
    })
    .join('\n')

  const wptXml = waypoints
    .map(
      (w, i) =>
        `  <wpt lat="${w.latlng.lat.toFixed(7)}" lon="${w.latlng.lng.toFixed(7)}">\n    <name>WP${i + 1}</name>\n  </wpt>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Mapper"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1
    http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${now}</time>
  </metadata>
${wptXml}
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkptXml}
    </trkseg>
  </trk>
</gpx>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Dispara la descarga del archivo GPX en el navegador.
 */
export function downloadGpx(gpxString: string, filename = 'route.gpx') {
  const blob = new Blob([gpxString], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
