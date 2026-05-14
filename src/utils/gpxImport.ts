import gpxParser from 'gpxparser'
import type { Waypoint, RouteSegment, LatLng } from '../types'

export interface ParsedGPX {
  waypoints: Waypoint[]
  segments: RouteSegment[]
  hasTrack: boolean
}

/**
 * Parsea un archivo GPX y extrae waypoints y segmentos.
 * Si el GPX tiene tracks, los convierte en segmentos.
 * Si solo tiene waypoints, los carga sin segmentos.
 */
export function parseGpx(gpxContent: string): ParsedGPX {
  const parser = new gpxParser()
  parser.parse(gpxContent)

  const waypoints: Waypoint[] = []
  const segments: RouteSegment[] = []
  let hasTrack = false

  // ─── Procesar tracks (preferencia principal) ───────────────────────────────
  if (parser.tracks && parser.tracks.length > 0) {
    hasTrack = true
    const track = parser.tracks[0] // Tomar el primer track

    if (track.points && track.points.length > 0) {
      // Convertir puntos del track en waypoints y segmentos
      const allPoints = track.points.map((pt: any) => ({
        lat: pt.lat,
        lng: pt.lon,
        ele: pt.ele,
      }))

      // Crear waypoints cada N puntos para permitir edición
      // Usamos un intervalo adaptativo basado en la longitud del track
      const totalPoints = allPoints.length
      const targetWaypoints = Math.min(Math.max(Math.floor(totalPoints / 50), 10), 100)
      const step = Math.max(1, Math.floor(totalPoints / targetWaypoints))

      const waypointIndices: number[] = []
      for (let i = 0; i < totalPoints; i += step) {
        waypointIndices.push(i)
      }
      // Asegurar que el último punto está incluido
      if (waypointIndices[waypointIndices.length - 1] !== totalPoints - 1) {
        waypointIndices.push(totalPoints - 1)
      }

      // Crear waypoints
      waypointIndices.forEach((idx) => {
        const pt = allPoints[idx]
        waypoints.push({
          id: crypto.randomUUID(),
          latlng: { lat: pt.lat, lng: pt.lng },
        })
      })

      // Crear segmentos entre waypoints consecutivos
      for (let i = 0; i < waypointIndices.length - 1; i++) {
        const startIdx = waypointIndices[i]
        const endIdx = waypointIndices[i + 1]
        const segmentPoints = allPoints.slice(startIdx, endIdx + 1)

        // Calcular distancia del segmento
        let distance = 0
        for (let j = 0; j < segmentPoints.length - 1; j++) {
          distance += haversineDistance(segmentPoints[j], segmentPoints[j + 1])
        }

        segments.push({
          fromIndex: i,
          points: segmentPoints.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            ...(p.ele != null && { ele: p.ele }),
          })) as LatLng[],
          distance,
        })
      }
    }
  }

  // ─── Si no hay tracks, procesar waypoints ─────────────────────────────────
  if (!hasTrack && parser.waypoints && parser.waypoints.length > 0) {
    parser.waypoints.forEach((wp: any) => {
      waypoints.push({
        id: crypto.randomUUID(),
        latlng: { lat: wp.lat, lng: wp.lon },
      })
    })
  }

  // ─── Si no hay ni tracks ni waypoints, procesar rutas ─────────────────────
  if (waypoints.length === 0 && parser.routes && parser.routes.length > 0) {
    const route = parser.routes[0]
    if (route.points && route.points.length > 0) {
      route.points.forEach((pt: any) => {
        waypoints.push({
          id: crypto.randomUUID(),
          latlng: { lat: pt.lat, lng: pt.lon },
        })
      })
    }
  }

  return { waypoints, segments, hasTrack }
}

/**
 * Calcula la distancia en metros entre dos puntos usando la fórmula de Haversine.
 */
function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = toRad(p2.lat - p1.lat)
  const dLon = toRad(p2.lng - p1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Lee un archivo y devuelve su contenido como string.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Error al leer el archivo'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
