import type { LatLng, RouteSegment, ElevationPoint } from '../types'
import { fetchRoute, enrichWithElevation, samplePoints } from '../services/graphhopper'
import { useRouteStore } from '../store/useRouteStore'
import { translations } from '../i18n'
import { parseGpx, readFileAsText } from '../utils/gpxImport'

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
        useRouteStore.getState().locale,
      )

      const segment: RouteSegment = {
        fromIndex: idx - 1,
        points,
        distance,
      }
      store.addSegment(segment)

      // Recalcular perfil de elevación completo
      await _rebuildElevationProfile()
    } catch (err) {
      const t = translations[useRouteStore.getState().locale]
      const msg = err instanceof Error ? err.message : t.errorRoute
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
            useRouteStore.getState().locale,
          )
          store.addSegment({ fromIndex, points, distance })
        }),
      )

      await _rebuildElevationProfile()
    } catch (err) {
      const t = translations[useRouteStore.getState().locale]
      const msg = err instanceof Error ? err.message : t.errorRecalc
      store.setRoutingError(msg)
    } finally {
      store.setIsRouting(false)
    }
  }

  /** Reconstruye el perfil de elevación a partir de los segmentos actuales */
  async function _rebuildElevationProfile() {
    const segments = useRouteStore.getState().segments
    if (segments.length === 0) {
      useRouteStore.getState().setElevationProfile([])
      return
    }

    // Recopilar todos los puntos de todos los segmentos
    const allPoints: LatLng[] = []
    for (const segment of segments) {
      allPoints.push(...segment.points)
    }

    // Samplear para no sobrecargar la API (máximo 100 puntos)
    const sampledPoints = samplePoints(allPoints, 100)
    
    // Enriquecer con elevación desde Open-Elevation
    const enrichedPoints = await enrichWithElevation(sampledPoints)

    // Construir el perfil con las elevaciones reales
    const profile: ElevationPoint[] = []
    let accumulated = 0

    for (let i = 0; i < enrichedPoints.length; i++) {
      const pt = enrichedPoints[i]
      profile.push({
        distance: +(accumulated / 1000).toFixed(3),
        elevation: pt.ele,
        lat: pt.lat,
        lng: pt.lng,
      })

      if (i < enrichedPoints.length - 1) {
        accumulated += _haversine(enrichedPoints[i], enrichedPoints[i + 1])
      }
    }

    useRouteStore.getState().setElevationProfile(profile)
  }

  /**
   * Importa una ruta desde un archivo GPX.
   * Parsea el archivo y carga los waypoints y segmentos al store.
   */
  async function importGpx(file: File) {
    try {
      const content = await readFileAsText(file)
      const { waypoints, segments } = parseGpx(content)

      if (waypoints.length === 0) {
        const t = translations[useRouteStore.getState().locale]
        throw new Error(t.importInvalidFile)
      }

      // Confirmar si ya hay datos
      const currentWaypoints = useRouteStore.getState().waypoints
      if (currentWaypoints.length > 0) {
        const t = translations[useRouteStore.getState().locale]
        if (!confirm(t.importConfirm)) {
          return
        }
      }

      store.importRoute(waypoints, segments)
      await _rebuildElevationProfile()
    } catch (err) {
      const t = translations[useRouteStore.getState().locale]
      const msg = err instanceof Error ? err.message : t.importError
      store.setRoutingError(msg)
      throw err
    }
  }

  return {
    addPoint,
    recalcSegmentsForWaypoint,
    importGpx,
    waypoints: store.waypoints,
    segments: store.segments,
    elevationProfile: store.elevationProfile,
    isRouting: store.isRouting,
    routingError: store.routingError,
    totalDistance: store.totalDistance(),
    totalElevationGain: store.totalElevationGain(),
    clearRoute: store.clearRoute,
    undo() {
      store.undo()
      setTimeout(() => _rebuildElevationProfile(), 0)
    },
    redo() {
      store.redo()
      setTimeout(() => _rebuildElevationProfile(), 0)
    },
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
