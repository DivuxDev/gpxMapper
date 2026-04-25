import type { LatLng, RouteSegment, ElevationPoint } from '../types'
import { fetchRoute } from '../services/graphhopper'
import { useRouteStore } from '../store/useRouteStore'

const API_KEY = import.meta.env.VITE_GRAPHHOPPER_API_KEY as string

/**
 * Hook principal de lógica de ruta.
 * Expone acciones de alto nivel que orquestan llamadas a la API y
 * actualizaciones del store.
 */
export function useRoute() {
  const store = useRouteStore()

  /**
   * Añade un waypoint y calcula automáticamente el segmento
   * desde el waypoint anterior usando GraphHopper.
   */
  async function addPoint(latlng: LatLng) {
    const id = store.addWaypoint(latlng)
    const waypoints = useRouteStore.getState().waypoints
    const idx = waypoints.findIndex((w) => w.id === id)

    // Si es el primer punto, no hay segmento que calcular
    if (idx === 0) return

    const from = waypoints[idx - 1].latlng
    const to = latlng

    store.setIsRouting(true)
    store.setRoutingError(null)

    try {
      const { points, distance } = await fetchRoute(
        from,
        to,
        store.routingProfile,
        API_KEY,
      )

      const segment: RouteSegment = {
        fromIndex: idx - 1,
        points,
        distance,
      }
      store.addSegment(segment)

      // Recalcular perfil de elevación completo
      _rebuildElevationProfile()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al trazar la ruta'
      store.setRoutingError(msg)
    } finally {
      store.setIsRouting(false)
    }
  }

  /**
   * Recalcula el segmento adyacente después de mover un waypoint.
   * Recalcula los segmentos fromIndex-1 y fromIndex.
   */
  async function recalcSegmentsForWaypoint(waypointId: string, latlng: LatLng) {
    store.updateWaypointPosition(waypointId, latlng)
    const waypoints = useRouteStore.getState().waypoints
    const idx = waypoints.findIndex((w) => w.id === waypointId)

    store.setIsRouting(true)
    store.setRoutingError(null)

    try {
      const recalcIndices: number[] = []
      if (idx > 0) recalcIndices.push(idx - 1)
      if (idx < waypoints.length - 1) recalcIndices.push(idx)

      await Promise.all(
        recalcIndices.map(async (fromIndex) => {
          const from = waypoints[fromIndex].latlng
          const to = waypoints[fromIndex + 1].latlng
          const { points, distance } = await fetchRoute(
            from,
            to,
            store.routingProfile,
            API_KEY,
          )
          store.addSegment({ fromIndex, points, distance })
        }),
      )

      _rebuildElevationProfile()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al recalcular la ruta'
      store.setRoutingError(msg)
    } finally {
      store.setIsRouting(false)
    }
  }

  /** Reconstruye el perfil de elevación a partir de los segmentos actuales */
  function _rebuildElevationProfile() {
    const segments = useRouteStore.getState().segments
    if (segments.length === 0) {
      useRouteStore.getState().setElevationProfile([])
      return
    }

    const profile: ElevationPoint[] = []
    let accumulated = 0

    for (const segment of segments) {
      for (let i = 0; i < segment.points.length; i++) {
        const pt = segment.points[i] as LatLng & { alt?: number }
        // GraphHopper con elevation=true devuelve [lng, lat, ele] en las coordenadas
        // pero ya los mapeamos a LatLng; la elevación viaja como propiedad extra
        const elevation = (pt as unknown as { ele?: number }).ele ?? 0
        profile.push({ distance: +(accumulated / 1000).toFixed(3), elevation })

        if (i < segment.points.length - 1) {
          accumulated += _haversine(segment.points[i], segment.points[i + 1])
        }
      }
    }

    useRouteStore.getState().setElevationProfile(profile)
  }

  return {
    addPoint,
    recalcSegmentsForWaypoint,
    waypoints: store.waypoints,
    segments: store.segments,
    elevationProfile: store.elevationProfile,
    isRouting: store.isRouting,
    routingError: store.routingError,
    totalDistance: store.totalDistance(),
    totalElevationGain: store.totalElevationGain(),
    clearRoute: store.clearRoute,
    undo: store.undo,
    redo: store.redo,
    removeWaypoint: store.removeWaypoint,
    canUndo: store.past.length > 0,
    canRedo: store.future.length > 0,
  }
}

// ─── Fórmula de Haversine para calcular distancia entre dos puntos ─────────────
function _haversine(a: LatLng, b: LatLng): number {
  const R = 6371000 // metros
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
