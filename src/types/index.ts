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
  /** Coordenadas del punto (para el crosshair en el mapa) */
  lat: number
  lng: number
}

// ─── Capa de mapa disponible ───────────────────────────────────────────────────
export type MapLayer = 'osm' | 'topo' | 'satellite' | 'cycle' | 'esritopo'

// ─── Perfil de routing (solo trail/foot) ────────────────────────────────────────
export type RoutingProfile = 'foot'

// ─── Respuesta de la API de GraphHopper ────────────────────────────────────────
export interface GraphHopperRoute {
  paths: Array<{
    distance: number
    time: number
    points: {
      coordinates: [number, number, number?][]
    }
    points_encoded: boolean
  }>
  info?: {
    copyrights?: string[]
    took?: number
  }
}
