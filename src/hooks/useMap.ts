import { useRef, useCallback } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { useRouteStore } from '../store/useRouteStore'

/**
 * Hook que encapsula la instancia del mapa Leaflet
 * y acciones de control del viewport.
 */
export function useMap() {
  const mapRef = useRef<LeafletMap | null>(null)
  const activeLayer = useRouteStore((s) => s.activeLayer)
  const setActiveLayer = useRouteStore((s) => s.setActiveLayer)

  const setMap = useCallback((map: LeafletMap | null) => {
    mapRef.current = map
  }, [])

  const flyToWaypoints = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const waypoints = useRouteStore.getState().waypoints
    if (waypoints.length === 0) return

    if (waypoints.length === 1) {
      map.flyTo([waypoints[0].latlng.lat, waypoints[0].latlng.lng], 14)
      return
    }

    const lats = waypoints.map((w) => w.latlng.lat)
    const lngs = waypoints.map((w) => w.latlng.lng)
    map.flyToBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [40, 40] })
  }, [])

  return { mapRef, setMap, activeLayer, setActiveLayer, flyToWaypoints }
}
