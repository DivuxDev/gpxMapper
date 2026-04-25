import type { LatLng, GraphHopperRoute, RoutingProfile } from '../types'
import { translations } from '../i18n'
import type { Locale } from '../i18n'

// ── Selección de backend por variable de entorno ───────────────────────────────
// VITE_ROUTING_PROVIDER=graphhopper  → llama a GraphHopper (requiere API key, devuelve elevación)
// VITE_ROUTING_PROVIDER=osrm         → llama a OSRM (sin key; sin elevación)
//   VITE_OSRM_URL para servidor local (default: demo público de OSRM)
const PROVIDER = (import.meta.env.VITE_ROUTING_PROVIDER as string) || 'osrm'
const GH_BASE  = 'https://graphhopper.com/api/1/route'
const OSRM_BASE = (import.meta.env.VITE_OSRM_URL as string) || 'https://router.project-osrm.org/route/v1'

// ── Mapeo de perfiles a OSRM ──────────────────────────────────────────────────
function toOsrmProfile(_profile: RoutingProfile): 'walking' {
  return 'walking'
}

interface OsrmResponse {
  code: string
  message?: string
  routes: Array<{
    distance: number
    geometry: { coordinates: [number, number][] }
  }>
}

// ── Helpers de elevación (OpenTopoData, SRTM 90 m) ──────────────────────────────
// Reduce un array a max maxCount puntos equidistantes conservando los extremos
function samplePoints(points: LatLng[], maxCount: number): LatLng[] {
  if (points.length <= maxCount) return points
  const result: LatLng[] = [points[0]]
  const step = (points.length - 1) / (maxCount - 1)
  for (let i = 1; i < maxCount - 1; i++) {
    result.push(points[Math.round(i * step)])
  }
  result.push(points[points.length - 1])
  return result
}

interface TopoDataResponse {
  results: Array<{ elevation: number | null }>
}

// Enriquece puntos con elevación via Open-Elevation (soporta CORS con POST).
// Sin API key. Si la API falla, devuelve ele=0 para no bloquear la ruta.
async function enrichWithElevation(
  points: LatLng[],
): Promise<Array<LatLng & { ele: number }>> {
  try {
    const resp = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        locations: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      }),
    })
    if (!resp.ok) throw new Error(`Open-Elevation ${resp.status}`)
    const data: TopoDataResponse = await resp.json()
    return points.map((pt, i) => ({ ...pt, ele: data.results[i]?.elevation ?? 0 }))
  } catch {
    return points.map((pt) => ({ ...pt, ele: 0 }))
  }
}

// ── Cliente OSRM ───────────────────────────────────────────────────────────────
async function fetchOsrm(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
  locale: Locale = 'es',
): Promise<{ points: LatLng[]; distance: number }> {
  const prof = toOsrmProfile(profile)
  const url  = `${OSRM_BASE}/${prof}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`OSRM error ${response.status}: ${response.statusText}`)

  const data: OsrmResponse = await response.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message ?? translations[locale].noRouteFound)
  }

  const rawPoints: LatLng[] = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  const sampled = samplePoints(rawPoints, 50)
  const points = await enrichWithElevation(sampled)
  return { points, distance: data.routes[0].distance }
}

// ── Cliente GraphHopper ────────────────────────────────────────────────────────
async function fetchGraphHopper(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
  apiKey: string,
  locale: Locale = 'es',
): Promise<{ points: LatLng[]; distance: number }> {
  const params = new URLSearchParams({ key: apiKey, profile, locale: locale === 'en' ? 'en' : 'es', points_encoded: 'false', elevation: 'true' })
  params.append('point', `${from.lat},${from.lng}`)
  params.append('point', `${to.lat},${to.lng}`)

  const response = await fetch(`${GH_BASE}?${params.toString()}`)
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GraphHopper error ${response.status}: ${err}`)
  }

  const data: GraphHopperRoute = await response.json()
  if (!data.paths?.length) throw new Error(translations[locale].noRouteFound)

  const path = data.paths[0]
  if (!path.points || typeof path.points !== 'object' || !path.points.coordinates) {
    throw new Error(translations[locale].noCoordinates)
  }

  const points = path.points.coordinates.map(([lng, lat, ele]) => {
    const pt: LatLng & { ele?: number } = { lat, lng }
    if (ele != null) pt.ele = ele
    return pt
  })
  return { points, distance: path.distance }
}

// ── Punto de entrada único ─────────────────────────────────────────────────────
export async function fetchRoute(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
  locale: Locale = 'es',
): Promise<{ points: LatLng[]; distance: number }> {
  if (PROVIDER === 'graphhopper') {
    const apiKey = import.meta.env.VITE_GRAPHHOPPER_API_KEY as string
    return fetchGraphHopper(from, to, profile, apiKey, locale)
  }
  return fetchOsrm(from, to, profile, locale)
}
