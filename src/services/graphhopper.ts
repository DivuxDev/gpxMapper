import type { LatLng, GraphHopperRoute, RoutingProfile } from '../types'

const BASE_URL = 'https://graphhopper.com/api/1/route'

/**
 * Llama a la API de GraphHopper para obtener una ruta entre dos puntos.
 * Devuelve la polilínea de puntos y la distancia total del segmento.
 */
export async function fetchRoute(
  from: LatLng,
  to: LatLng,
  profile: RoutingProfile,
  apiKey: string,
): Promise<{ points: LatLng[]; distance: number }> {
  const params = new URLSearchParams({
    key: apiKey,
    vehicle: profile,
    locale: 'es',
    points_encoded: 'false',
    elevation: 'true',
  })

  // GraphHopper espera lat,lng (no lng,lat)
  const body = {
    points: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    profile,
    locale: 'es',
    points_encoded: false,
    elevation: true,
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GraphHopper error ${response.status}: ${err}`)
  }

  const data: GraphHopperRoute = await response.json()

  if (!data.paths || data.paths.length === 0) {
    throw new Error('No se encontró ruta entre los puntos seleccionados.')
  }

  const path = data.paths[0]
  const points: LatLng[] = path.points.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }))

  return { points, distance: path.distance }
}
