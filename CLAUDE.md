# CLAUDE.md — Contexto de codebase para asistentes IA

Este archivo proporciona contexto estructurado sobre el proyecto **GPX Mapper** para que los asistentes IA (Claude, Copilot, etc.) entiendan la arquitectura y convenciones antes de generar o modificar código.

---

## ¿Qué es este proyecto?

MVP de un editor de rutas GPX web, Mobile-First. El usuario toca un mapa para añadir puntos; la app llama a GraphHopper para calcular la ruta snap-to-road entre puntos consecutivos, dibuja la polilínea y muestra métricas (distancia, desnivel). La ruta se puede exportar como archivo GPX estándar.

**Usuarios objetivo:** trail runners, ciclistas, senderistas.

---

## Stack y versiones fijadas

```
React 18.3        react-leaflet 4.2    Zustand 4.5
Vite 5.3          Recharts 2.12        TypeScript 5.5
Tailwind CSS 3.4  Leaflet 1.9          gpxparser 3.0 (instalado, no integrado aún)
```

> **Routing:** usa el servidor público de OSRM (`router.project-osrm.org`). Sin API key. No devuelve elevación.

---

## Arquitectura central

### Flujo de estado

```
useRoute (hook) ──► useRouteStore (Zustand) ──► componentes (suscripción selectiva)
      │
      └──► graphhopper.ts (fetch)
```

- **`useRouteStore`** es la única fuente de verdad. Usa `persist` de Zustand → localStorage.
- Los componentes nunca llaman a `fetchRoute` directamente; usan `useRoute`.
- El estado de UI (`drawerOpen`, `isRouting`, `routingError`) vive también en el store.

### Árbol de componentes

```
App.tsx
├── header (flotante, z-900)
│   └── ZoomButton (×2) — controla el mapa via _leaflet_map en el DOM
├── MapContainer
│   ├── LeafletMapContainer (react-leaflet)
│   ├── TileLayer (key=activeLayer para forzar remount al cambiar capa)
│   ├── ClickHandler (useMapEvents)
│   ├── Polyline (todos los segmentos concatenados)
│   └── DraggableMarker (×N waypoints)
└── RouteDrawer (bottom sheet, z-900)
    ├── StatPill ×3 (Distancia, D+, Puntos)
    ├── Undo/Redo buttons
    ├── ElevationChart (Recharts AreaChart)
    ├── LayerControl (mapa + perfil routing)
    ├── ExportButton
    └── Limpiar ruta
```

---

## Archivos clave y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `src/store/useRouteStore.ts` | Todo el estado: waypoints, segments, elevationProfile, UI, undo/redo (30 niveles). Persiste en localStorage. |
| `src/hooks/useRoute.ts` | Orquesta: addPoint, recalcSegmentsForWaypoint, undo, redo, clearRoute, _rebuildElevationProfile. |
| `src/hooks/useMap.ts` | Ref de la instancia Leaflet, flyToWaypoints. No conectado al mapa en el render actual (el mapa usa ClickHandler interno). |
| `src/services/graphhopper.ts` | Cliente OSRM: `fetchRoute(from, to, profile)` → GET a `https://router.project-osrm.org`. Sin API key. Sin elevación. |
| `src/utils/gpxExport.ts` | `buildGpx(waypoints, segments)` genera XML GPX 1.1 completo. `downloadGpx` dispara la descarga en el browser. |
| `src/utils/formatters.ts` | `formatDistance` (m → km si ≥ 1000m), `formatElevation`, `calcElevationGain`. |
| `src/types/index.ts` | Interfaces compartidas: `LatLng`, `Waypoint`, `RouteSegment`, `ElevationPoint`, `MapLayer`, `RoutingProfile`, `GraphHopperRoute`. |

---

## Tipos importantes

```typescript
// Punto geográfico
interface LatLng { lat: number; lng: number }

// Waypoint creado por el usuario
interface Waypoint { id: string; latlng: LatLng }

// Segmento calculado por GraphHopper entre dos waypoints consecutivos
interface RouteSegment {
  fromIndex: number   // índice del waypoint origen en el array
  points: LatLng[]    // polilínea snap-to-road
  distance: number    // metros
}

// Punto del gráfico de elevación
interface ElevationPoint { distance: number; elevation: number } // km y m

type MapLayer = 'osm' | 'topo' | 'satellite'
type RoutingProfile = 'foot' | 'bike' | 'mtb' | 'racingbike' | 'car'
```

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_GH_DEFAULT_PROFILE` | No | Perfil de routing por defecto (`foot`) |

No se necesita API key. El routing usa el servidor público de OSRM.

---

## Convenciones de código

### Estilos (Tailwind)
- Mobile-first estricto.
- Color primario: paleta `trail` (green-500 = `#22c55e`). Definida en `tailwind.config.js`.
- Fuentes: `font-sans` = Inter var (cuerpo), `font-display` = Space Grotesk (títulos).
- **Todos los controles interactivos deben tener `min-h-[44px] min-w-[44px]`** (hitbox táctil mínimo).
- Breakpoint extra: `xs: 375px`.

### Zustand
- Suscripción selectiva siempre: `useRouteStore((s) => s.campo)` — nunca desestructurar el store completo en un componente para evitar re-renders innecesarios.
- Las acciones que modifican `waypoints` o `segments` deben primero hacer push al array `past` (para undo).

### OSRM (routing)
- El endpoint es GET `/{profile}/{lng,lat};{lng,lat}?overview=full&geometries=geojson`.
- Perfiles OSRM: `driving` (car), `cycling` (bike/mtb/racingbike), `walking` (foot). La conversión ocurre en `graphhopper.ts`.
- La respuesta **no incluye elevación**. El `elevationProfile` quedará vacío hasta que se integre una fuente de altitud.

### Leaflet con Vite
- Fix obligatorio de íconos: borrar `_getIconUrl` de `Icon.Default.prototype` y re-asignar las URLs desde CDN. Ya está en `MapContainer.tsx`.
- `zoomControl={false}` en el mapa — los botones de zoom los implementa `App.tsx` para mantener el diseño.
- Cambiar capa de tiles: se usa `key={activeLayer}` en `TileLayer` para forzar un remount limpio.

### Exportación GPX
- `buildGpx` genera GPX 1.1 con `<wpt>` para cada waypoint y `<trk><trkseg>` con los puntos de la polilínea snap-to-road.
- Si no hay segmentos calculados (solo 1 waypoint), exporta los waypoints como track directamente.
- Los valores flotantes se redondean: lat/lon a 7 decimales, elevación a 1 decimal.

---

## Comportamiento de undo/redo

- El store guarda hasta 30 snapshots en `past` (solo `waypoints` + `segments`, no UI state).
- Cada acción mutante (`addWaypoint`, `removeWaypoint`, `updateWaypointPosition`) hace `push` a `past` y limpia `future`.
- `undo`: pop de `past`, push a `future`, restaura snapshot.
- `redo`: pop de `future`, push a `past`, restaura snapshot.
- El `elevationProfile` **no** se guarda en snapshots de undo; se recalcula al restaurar (o puede quedar desfasado temporalmente; esto es un área de mejora).

---

## Áreas pendientes / deuda técnica

- **Importación GPX**: `gpxparser` está instalado en `package.json` pero su integración no está implementada.
- **`useMap` desconectado**: el hook existe y tiene `flyToWaypoints` pero la referencia al mapa Leaflet no se pasa desde `MapContainer` al hook (el mapa usa `useMapEvents` internamente).
- **Undo de elevationProfile**: el perfil de elevación no se incluye en los snapshots de undo/redo, causando posible inconsistencia visual al deshacer.
- **Car profile**: `car` está en los tipos pero no aparece en la UI de `LayerControl`.
- **Tests**: no hay tests unitarios ni de integración.

---

## Comandos de desarrollo

```bash
npm run dev       # dev server (http://localhost:5173)
npm run build     # tsc && vite build → dist/
npm run preview   # sirve dist/ localmente
npm run lint      # ESLint (0 warnings permitidos)
```

---

## Lo que NO hacer

- No llamar a `fetchRoute` directamente desde componentes — siempre a través de `useRoute`.
- No desestructurar el store completo en componentes React.
- No añadir `zoomControl` a `LeafletMapContainer` (ya está desactivado intencionalmente).
- No usar `any` en TypeScript — usar los tipos de `src/types/index.ts`.
- No hardcodear ninguna URL de API — mantenerlas en las constantes del servicio.
