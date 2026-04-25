import { useRef } from 'react'
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoute } from '../hooks/useRoute'
import { useRouteStore } from '../store/useRouteStore'
import type { LatLng } from '../types'

// ── Fix ícono de Leaflet con bundlers (Vite) ────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Ícono personalizado para waypoints ─────────────────────────────────────────
function makeWaypointIcon(index: number, total: number) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const color = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#3b82f6'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.94 14 22 14 22S28 23.94 28 14C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    className: '',
  })
}

// ── Capas de mapa disponibles ───────────────────────────────────────────────────
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
}

// ── Sub-componente: detecta clicks en el mapa ──────────────────────────────────
interface ClickHandlerProps {
  onMapClick: (latlng: LatLng) => void
}

function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// ── Sub-componente: marcador arrastrable ───────────────────────────────────────
interface DraggableMarkerProps {
  waypointId: string
  latlng: LatLng
  index: number
  total: number
  onDragEnd: (id: string, latlng: LatLng) => void
}

function DraggableMarker({ waypointId, latlng, index, total, onDragEnd }: DraggableMarkerProps) {
  const markerRef = useRef<L.Marker>(null)

  return (
    <Marker
      ref={markerRef}
      position={[latlng.lat, latlng.lng]}
      icon={makeWaypointIcon(index, total)}
      draggable={true}
      eventHandlers={{
        dragend() {
          const pos = markerRef.current?.getLatLng()
          if (pos) {
            onDragEnd(waypointId, { lat: pos.lat, lng: pos.lng })
          }
        },
      }}
    />
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function MapContainer() {
  const { addPoint, recalcSegmentsForWaypoint, waypoints, segments, isRouting } = useRoute()
  const activeLayer = useRouteStore((s) => s.activeLayer)

  const tileLayer = TILE_LAYERS[activeLayer]

  // Polilínea combinada de todos los segmentos
  const allPolylinePoints = segments.flatMap((s) =>
    s.points.map((p) => [p.lat, p.lng] as [number, number]),
  )

  return (
    <div className="relative w-full h-full">
      {/* Indicador de carga */}
      {isRouting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm
          px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium text-trail-700">
          <span className="w-4 h-4 border-2 border-trail-500 border-t-transparent rounded-full animate-spin" />
          Trazando ruta…
        </div>
      )}

      <LeafletMapContainer
        center={[40.416775, -3.70379]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Capa de teselas activa */}
        <TileLayer
          key={activeLayer}
          url={tileLayer.url}
          attribution={tileLayer.attribution}
          maxZoom={19}
        />

        {/* Handler de clicks */}
        <ClickHandler onMapClick={addPoint} />

        {/* Polilínea de ruta */}
        {allPolylinePoints.length > 0 && (
          <Polyline
            positions={allPolylinePoints}
            color="#22c55e"
            weight={4}
            opacity={0.85}
          />
        )}

        {/* Marcadores de waypoints */}
        {waypoints.map((wp, idx) => (
          <DraggableMarker
            key={wp.id}
            waypointId={wp.id}
            latlng={wp.latlng}
            index={idx}
            total={waypoints.length}
            onDragEnd={recalcSegmentsForWaypoint}
          />
        ))}
      </LeafletMapContainer>
    </div>
  )
}
