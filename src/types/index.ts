// ─── Coordenadas ───────────────────────────────────────────────────────────────
export interface LatLng {
  lat: number
  lng: number
}

// ─── Punto de ruta (waypoint del usuario) ──────────────────────────────────────
export interface Waypoint {
  id: string
  latlng: LatLng
}

// ─── Segmento de ruta entre dos waypoints ──────────────────────────────────────
export interface RouteSegment {
  /** Índice del waypoint de origen (en el array de waypoints) */
  fromIndex: number
  /** Polilínea de puntos que GraphHopper devuelve */
  points: LatLng[]
  /** Distancia del segmento en metros */
  distance: number
}

// ─── Punto de elevación para el gráfico ────────────────────────────────────────
export interface ElevationPoint {
  /** Distancia acumulada en km */
  distance: number
  /** Elevación en metros */
  elevation: number
}

// ─── Capa de mapa disponible ───────────────────────────────────────────────────
export type MapLayer = 'osm' | 'topo' | 'satellite'

// ─── Perfil de routing de GraphHopper ──────────────────────────────────────────
export type RoutingProfile = 'foot' | 'bike' | 'mtb' | 'racingbike' | 'car'

// ─── Respuesta de la API de GraphHopper ────────────────────────────────────────
export interface GraphHopperRoute {
  paths: Array<{
    distance: number
    time: number
    points: {
      coordinates: [number, number, number?][]
    }
    points_encoded: boolean
    legs?: unknown[]
  }>
  info?: {
    copyrights?: string[]
    took?: number
  }
}
