import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Waypoint,
  RouteSegment,
  ElevationPoint,
  MapLayer,
  RoutingProfile,
  LatLng,
} from '../types'
import type { Locale } from '../i18n'

// ─── Estado completo de la app ─────────────────────────────────────────────────
interface RouteState {
  // Datos de ruta
  waypoints: Waypoint[]
  segments: RouteSegment[]
  elevationProfile: ElevationPoint[]

  // UI
  activeLayer: MapLayer
  routingProfile: RoutingProfile
  locale: Locale
  drawerOpen: boolean
  isRouting: boolean
  routingError: string | null
  hoverPoint: LatLng | null

  // Undo / Redo
  past: Array<{ waypoints: Waypoint[]; segments: RouteSegment[] }>
  future: Array<{ waypoints: Waypoint[]; segments: RouteSegment[] }>

  // ─── Acciones ────────────────────────────────────────────────────────────────
  addWaypoint: (latlng: LatLng) => string
  removeWaypoint: (id: string) => void
  updateWaypointPosition: (id: string, latlng: LatLng) => void
  addSegment: (segment: RouteSegment) => void
  setElevationProfile: (profile: ElevationPoint[]) => void
  setActiveLayer: (layer: MapLayer) => void
  setRoutingProfile: (profile: RoutingProfile) => void
  setDrawerOpen: (open: boolean) => void
  setIsRouting: (routing: boolean) => void
  setRoutingError: (error: string | null) => void
  setHoverPoint: (pt: LatLng | null) => void
  setLocale: (locale: Locale) => void
  clearRoute: () => void
  importRoute: (waypoints: Waypoint[], segments: RouteSegment[]) => void
  undo: () => void
  redo: () => void

  // Estadísticas calculadas
  totalDistance: () => number
  totalElevationGain: () => number
}

// ─── Snapshot del estado para undo/redo ────────────────────────────────────────
function snapshot(state: RouteState) {
  return {
    waypoints: [...state.waypoints],
    segments: [...state.segments],
  }
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      waypoints: [],
      segments: [],
      elevationProfile: [],
      activeLayer: 'osm',
      routingProfile:
        (import.meta.env.VITE_GH_DEFAULT_PROFILE as RoutingProfile) || 'foot',
      locale: (navigator.language?.slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es') as Locale,
      drawerOpen: false,
      isRouting: false,
      routingError: null,
      hoverPoint: null,
      past: [],
      future: [],

      // ── Añadir waypoint ────────────────────────────────────────────────────
      addWaypoint: (latlng) => {
        const id = crypto.randomUUID()
        set((state) => ({
          past: [...state.past.slice(-29), snapshot(state)],
          future: [],
          waypoints: [...state.waypoints, { id, latlng }],
        }))
        return id
      },

      // ── Eliminar waypoint (y sus segmentos relacionados) ───────────────────
      removeWaypoint: (id) => {
        set((state) => {
          const idx = state.waypoints.findIndex((w) => w.id === id)
          if (idx === -1) return state
          const newWaypoints = state.waypoints.filter((w) => w.id !== id)
          const newSegments = state.segments.filter(
            (s) => s.fromIndex !== idx - 1 && s.fromIndex !== idx,
          )
          // Reindexar segmentos posteriores
          const reindexed = newSegments.map((s) =>
            s.fromIndex > idx ? { ...s, fromIndex: s.fromIndex - 1 } : s,
          )
          return {
            past: [...state.past.slice(-29), snapshot(state)],
            future: [],
            waypoints: newWaypoints,
            segments: reindexed,
          }
        })
      },

      // ── Mover waypoint (drag & drop) ───────────────────────────────────────
      updateWaypointPosition: (id, latlng) => {
        set((state) => ({
          past: [...state.past.slice(-29), snapshot(state)],
          future: [],
          waypoints: state.waypoints.map((w) =>
            w.id === id ? { ...w, latlng } : w,
          ),
        }))
      },

      // ── Añadir segmento calculado ──────────────────────────────────────────
      addSegment: (segment) => {
        set((state) => {
          const filtered = state.segments.filter(
            (s) => s.fromIndex !== segment.fromIndex,
          )
          return { segments: [...filtered, segment].sort((a, b) => a.fromIndex - b.fromIndex) }
        })
      },

      setElevationProfile: (profile) => set({ elevationProfile: profile }),
      setActiveLayer: (layer) => set({ activeLayer: layer }),
      setRoutingProfile: (profile) => set({ routingProfile: profile }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      setIsRouting: (routing) => set({ isRouting: routing }),
      setRoutingError: (error) => set({ routingError: error }),
      setHoverPoint: (pt) => set({ hoverPoint: pt }),
      setLocale: (locale) => set({ locale }),

      clearRoute: () =>
        set({
          past: [],
          future: [],
          waypoints: [],
          segments: [],
          elevationProfile: [],
          routingError: null,
        }),

      // ── Importar ruta desde GPX ────────────────────────────────────
      importRoute: (waypoints, segments) => {
        set((state) => ({
          past: [...state.past.slice(-29), snapshot(state)],
          future: [],
          waypoints,
          segments,
          elevationProfile: [], // Se reconstruirá después desde useRoute
        }))
      },

      // ── Undo ───────────────────────────────────────────────────────────────
      undo: () => {
        const { past, future } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        const newPast = past.slice(0, -1)
        set((state) => ({
          past: newPast,
          future: [snapshot(state), ...future.slice(0, 29)],
          waypoints: previous.waypoints,
          segments: previous.segments,
        }))
      },

      // ── Redo ───────────────────────────────────────────────────────────────
      redo: () => {
        const { past, future } = get()
        if (future.length === 0) return
        const next = future[0]
        const newFuture = future.slice(1)
        set((state) => ({
          past: [...past.slice(-29), snapshot(state)],
          future: newFuture,
          waypoints: next.waypoints,
          segments: next.segments,
        }))
      },

      // ── Estadísticas ───────────────────────────────────────────────────────
      totalDistance: () =>
        get().segments.reduce((acc, s) => acc + s.distance, 0),

      totalElevationGain: () => {
        const profile = get().elevationProfile
        let gain = 0
        for (let i = 1; i < profile.length; i++) {
          const diff = profile[i].elevation - profile[i - 1].elevation
          if (diff > 0) gain += diff
        }
        return gain
      },
    }),
    {
      name: 'gpxmapper-route',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos de ruta, no estado de UI efímero
      partialize: (state) => ({
        waypoints: state.waypoints,
        segments: state.segments,
        elevationProfile: state.elevationProfile,
        activeLayer: state.activeLayer,
        routingProfile: state.routingProfile,
        locale: state.locale,
      }),
    },
  ),
)
