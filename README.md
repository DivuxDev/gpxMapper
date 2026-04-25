# GPX Mapper

Editor de rutas GPX interactivo y **Mobile-First** para trail running, ciclismo y senderismo. Inspirado en [gpx.studio](https://gpx.studio), permite crear rutas ajustadas a caminos reales usando snap-to-road con la API de GraphHopper.

---

## Características

- **Mapa full-screen** con soporte táctil optimizado para móvil
- **Snap-to-road automático** — al añadir un punto se calcula la ruta real con OSRM (sin API key)
- **Tres capas de mapa** — OpenStreetMap, Topográfico (OpenTopoMap), Satélite (Esri)
- **Cuatro perfiles de routing** — Trail (pie), Bici, MTB, Carretera
- **Perfil de elevación dinámico** con gráfico de área interactivo (Recharts)
- **Panel inferior deslizable** con estadísticas (distancia, D+, nº de puntos)
- **Marcadores arrastrables** — mover un waypoint recalcula sus segmentos adjacentes
- **Undo / Redo** de 30 niveles
- **Exportación GPX** estándar 1.1 con waypoints y track (snap-to-road)
- **Persistencia automática** de la ruta en localStorage (Zustand persist)

---

## Stack técnico

| Categoría | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Estilos | Tailwind CSS 3 (mobile-first) |
| Mapas | Leaflet 1.9 + react-leaflet 4 |
| Routing | OSRM público (sin API key) |
| Gráficas | Recharts 2 |
| Estado global | Zustand 4 (con middleware `persist`) |
| Exportación | GPX custom builder (XML nativo) |

---

## Requisitos previos

- Node.js ≥ 18
- Sin API keys externas — el routing usa el servidor público de [OSRM](http://project-osrm.org/) (OpenStreetMap)

---

## Configuración y arranque

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno (opcional)

Puedes crear un archivo `.env` en la raíz para ajustar el perfil de routing por defecto:

```env
# Opcional — perfil de routing por defecto (foot | bike | mtb | racingbike | car)
VITE_GH_DEFAULT_PROFILE=foot
```

> No se necesita ningún API key.

### 3. Desarrollo local

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### 4. Build de producción

```bash
npm run build      # compila TypeScript + empaqueta con Vite
npm run preview    # sirve el build localmente para verificar
```

---

## Estructura del proyecto

```
gpxMapper/
├── public/
├── src/
│   ├── App.tsx                  # Shell principal (layout full-screen)
│   ├── main.tsx                 # Entry point React
│   ├── index.css                # Estilos globales + fuentes
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── MapContainer.tsx     # Mapa Leaflet, capas, markers, polilínea
│   │   ├── RouteDrawer.tsx      # Panel inferior deslizable, estadísticas
│   │   ├── ElevationChart.tsx   # Gráfico de área de elevación (Recharts)
│   │   ├── ExportButton.tsx     # Botón exportar GPX
│   │   └── LayerControl.tsx     # Selector de capa y perfil de routing
│   │
│   ├── hooks/
│   │   ├── useRoute.ts          # Lógica de alto nivel: addPoint, recalc, undo/redo
│   │   └── useMap.ts            # Ref del mapa Leaflet, flyToWaypoints
│   │
│   ├── services/
│   │   └── graphhopper.ts       # fetchRoute — cliente REST de GraphHopper
│   │
│   ├── store/
│   │   └── useRouteStore.ts     # Store Zustand: waypoints, segments, UI state
│   │
│   ├── types/
│   │   └── index.ts             # Interfaces TypeScript compartidas
│   │
│   └── utils/
│       ├── formatters.ts        # formatDistance, formatElevation, calcElevationGain
│       └── gpxExport.ts         # buildGpx, downloadGpx
│
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Flujo de datos

```
Usuario toca el mapa
      │
      ▼
MapContainer (ClickHandler)
      │  onMapClick(latlng)
      ▼
useRoute.addPoint(latlng)
      │
      ├─ store.addWaypoint(latlng)        ← push al estado + undo history
      │
      └─ graphhopper.fetchRoute(from, to) ← POST a la API
             │
             ├─ store.addSegment(segment)  ← polilínea + distancia
             └─ _rebuildElevationProfile() ← recalcula D+ acumulado
```

---

## Capas de mapa disponibles

| Key | Proveedor | URL base |
|---|---|---|
| Capas de mapa | | |
|---|---|---|
| `osrm` | OSRM público | `router.project-osrm.org` |
| `topo` | OpenTopoMap | `tile.opentopomap.org` |
| `satellite` | Esri World Imagery | `server.arcgisonline.com` |

---

## Perfiles de routing GraphHopper

| Key | Descripción |
|---|---|
| `foot` | Senderismo / trail running |
| `bike` | Ciclismo general |
| `mtb` | Mountain bike |
| `racingbike` | Bicicleta de carretera |
| `car` | Vehículo (desactivado en UI) |

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con HMR
npm run build    # Build de producción (tsc + vite build)
npm run lint     # ESLint sobre todos los archivos ts/tsx
npm run preview  # Preview del build de producción
```

---

## Licencia

Proyecto privado — MVP en desarrollo.
