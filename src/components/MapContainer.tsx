import { useRef, useState, useEffect } from 'react'
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Polyline,
  Marker,
  CircleMarker,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRoute } from '../hooks/useRoute'
import { useRouteStore } from '../store/useRouteStore'
import { useT } from '../hooks/useT'
import type { LatLng, MapLayer } from '../types'

// ── Fix ícono de Leaflet con bundlers (Vite) ────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ── Ícono de waypoint — bola circular ────────────────────────────────────────────
function makeWaypointIcon(index: number, total: number) {
  const isFirst = index === 0
  const isLast = index === total - 1
  let fill = '#3b82f6'
  if (isFirst) fill = '#22c55e'
  else if (isLast) fill = '#ef4444'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="${fill}" stroke="white" stroke-width="2.5"/></svg>`
  return L.divIcon({
    html: svg,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: '',
  })
}

// ── Capas de mapa disponibles ───────────────────────────────────────────────────
interface TileLayerDef {
  url: string
  attribution: string
  maxZoom?: number
  /** URL de capa de superposición opcional (calles / etiquetas encima de la base) */
  overlay?: string
}

export const TILE_LAYERS: Record<MapLayer, TileLayerDef> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP &mdash; Esri, HERE, DeLorme',
    maxZoom: 19,
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  },
  cycle: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases">CyclOSM</a> &mdash; OpenStreetMap contributors',
    maxZoom: 20,
  },
  esritopo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China',
    maxZoom: 19,
  },
}

// ── Instancia del mapa accesible desde fuera del contexto react-leaflet ────────
let _mapInstance: L.Map | null = null
export function getMapInstance() { return _mapInstance }

function MapInstanceSetter() {
  const map = useMap()
  useEffect(() => {
    _mapInstance = map
    return () => { _mapInstance = null }
  }, [map])
  return null
}

// ── Sub-componente: centra el mapa en la ubicación del usuario al montar ────────
function GeolocateOnMount() {
  const map = useMap()

  // Se ejecuta una sola vez al montar gracias al ref
  const done = useRef(false)
  if (!done.current) {
    done.current = true
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.2 })
        },
        () => {
          // Permiso denegado o error → fallback España (ya es el centro por defecto)
        },
        { timeout: 8000, maximumAge: 60000 },
      )
    }
  }

  return null
}

// ── Sub-componente: detecta clicks en el mapa ──────────────────────────────────
interface ClickHandlerProps {
  onMapClick: (latlng: LatLng) => void
  onCloseMenu: () => void
}

function ClickHandler({ onMapClick, onCloseMenu }: ClickHandlerProps) {
  const map = useMapEvents({
    click(e) {
      onCloseMenu()
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = 'crosshair'
    return () => { container.style.cursor = '' }
  }, [map])
  return null
}

// ── Sub-componente: marcador arrastrable con menú contextual ───────────────────
interface DraggableMarkerProps {
  waypointId: string
  latlng: LatLng
  index: number
  total: number
  onDragEnd: (id: string, latlng: LatLng) => void
  onMarkerClick: (id: string, x: number, y: number) => void
}

function DraggableMarker({
  waypointId,
  latlng,
  index,
  total,
  onDragEnd,
  onMarkerClick,
}: Readonly<DraggableMarkerProps>) {
  const markerRef = useRef<L.Marker>(null)

  return (
    <Marker
      ref={markerRef}
      position={[latlng.lat, latlng.lng]}
      icon={makeWaypointIcon(index, total)}
      draggable={true}
      eventHandlers={{
        click(e) {
          // Evitar que el click llegue al mapa (no añadir punto nuevo)
          e.originalEvent.stopPropagation()
          onMarkerClick(waypointId, e.containerPoint.x, e.containerPoint.y)
        },
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

// ── Menú contextual flotante ───────────────────────────────────────────────────
interface ContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onClose: () => void
}

function ContextMenu({ x, y, onDelete, onClose }: Readonly<ContextMenuProps>) {
  const t = useT()
  return (
    <>
      {/* Overlay transparente para cerrar al tocar fuera */}
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 z-[1001] w-full h-full cursor-default"
        onClick={onClose}
      />
      <div
        className="absolute z-[1002] bg-white rounded-2xl shadow-xl border border-gray-100
          overflow-hidden min-w-[160px]"
        style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 44px))' }}
      >
        <button
          onClick={() => { onDelete(); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600
            hover:bg-red-50 active:bg-red-100 transition-colors min-h-[44px]"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none"
            stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.deletePoint}
        </button>
      </div>
    </>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function MapContainer() {
  const { addPoint, recalcSegmentsForWaypoint, removeWaypoint, waypoints, segments, isRouting } = useRoute()
  const activeLayer = useRouteStore((s) => s.activeLayer)
  const hoverPoint = useRouteStore((s) => s.hoverPoint)
  const t = useT()

  const tileLayer = TILE_LAYERS[activeLayer]

  // Estado del menú contextual: posición en px relativa al contenedor del mapa
  const [contextMenu, setContextMenu] = useState<{ waypointId: string; x: number; y: number } | null>(null)

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
          <span
            className="w-4 h-4 border-2 border-trail-500 border-t-transparent rounded-full animate-spin"
          />
          {' '}{t.routingLoading}
        </div>
      )}

      {/* Menú contextual (fuera del LeafletMapContainer para z-index correcto) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => removeWaypoint(contextMenu.waypointId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <LeafletMapContainer
        center={[40.416775, -3.70379]}
        zoom={6}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Registra la instancia del mapa para uso externo (ej. botones de zoom) */}
        <MapInstanceSetter />

        {/* Geolocalización al arrancar */}
        <GeolocateOnMount />

        {/* Capa de teselas activa */}
        <TileLayer
          key={activeLayer}
          url={tileLayer.url}
          attribution={tileLayer.attribution}
          maxZoom={tileLayer.maxZoom ?? 19}
        />

        {/* Overlay de calles/etiquetas (solo para capas que lo tengan, ej. satélite) */}
        {tileLayer.overlay && (
          <TileLayer
            key={`${activeLayer}-overlay`}
            url={tileLayer.overlay}
            maxZoom={tileLayer.maxZoom ?? 19}
            opacity={0.8}
          />
        )}

        {/* Handler de clicks en el mapa */}
        <ClickHandler onMapClick={addPoint} onCloseMenu={() => setContextMenu(null)} />

        {/* Marcador de hover desde el gráfico de elevación */}
        {hoverPoint && typeof hoverPoint.lat === 'number' && typeof hoverPoint.lng === 'number' && (
          <CircleMarker
            center={[hoverPoint.lat, hoverPoint.lng]}
            radius={7}
            pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#22c55e', fillOpacity: 1 }}
          />
        )}

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
            onMarkerClick={(id, x, y) => setContextMenu({ waypointId: id, x, y })}
          />
        ))}
      </LeafletMapContainer>
    </div>
  )
}
