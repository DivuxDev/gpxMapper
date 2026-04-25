import type { LatLng, GraphHopperRoute, RoutingProfile } from '../types'

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

// ── Cliente OSRM ───────────────────────────────────────────────────────────────
async function fetchOsrm(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
): Promise<{ points: LatLng[]; distance: number }> {
  const prof = toOsrmProfile(profile)
  const url  = `${OSRM_BASE}/${prof}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`OSRM error ${response.status}: ${response.statusText}`)

  const data: OsrmResponse = await response.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message ?? 'No se encontró ruta entre los puntos seleccionados.')
  }

  const points: LatLng[] = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  return { points, distance: data.routes[0].distance }
}

// ── Cliente GraphHopper ────────────────────────────────────────────────────────
async function fetchGraphHopper(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
  apiKey: string,
): Promise<{ points: LatLng[]; distance: number }> {
  const params = new URLSearchParams({ key: apiKey, profile, locale: 'es', points_encoded: 'false', elevation: 'true' })
  params.append('point', `${from.lat},${from.lng}`)
  params.append('point', `${to.lat},${to.lng}`)

  const response = await fetch(`${GH_BASE}?${params.toString()}`)
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GraphHopper error ${response.status}: ${err}`)
  }

  const data: GraphHopperRoute = await response.json()
  if (!data.paths?.length) throw new Error('No se encontró ruta entre los puntos seleccionados.')

  const path = data.paths[0]
  if (!path.points || typeof path.points !== 'object' || !path.points.coordinates) {
    throw new Error('GraphHopper no devolvió coordenadas. Comprueba la API key o el perfil.')
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
): Promise<{ points: LatLng[]; distance: number }> {
  if (PROVIDER === 'graphhopper') {
    const apiKey = import.meta.env.VITE_GRAPHHOPPER_API_KEY as string
    return fetchGraphHopper(from, to, profile, apiKey)
  }
  return fetchOsrm(from, to, profile)
}
