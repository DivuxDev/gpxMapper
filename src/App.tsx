import { useEffect } from 'react'
import { MapContainer, getMapInstance } from './components/MapContainer'
import { RouteDrawer } from './components/RouteDrawer'
import { LayerControl } from './components/LayerControl'
import { useRouteStore } from './store/useRouteStore'
import { useT } from './hooks/useT'

/**
 * Shell principal de la aplicación.
 * El mapa ocupa el 100% del viewport y el drawer flota encima.
 */
export default function App() {
  const locale = useRouteStore((s) => s.locale)
  const setLocale = useRouteStore((s) => s.setLocale)
  const t = useT()
  // Prevenir el zoom nativo de iOS con doble tap mientras se usa el mapa
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      {/* Mapa: full screen */}
      <div className="absolute inset-0">
        <MapContainer />
      </div>

      {/* Header flotante */}
      <header className="absolute top-0 left-0 right-0 z-[900] pointer-events-none">
        <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-2xl
            px-4 py-2 shadow-lg flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-trail-600" fill="none"
              stroke="currentColor" strokeWidth={2}>
              <path d="M3 17l4-8 4 4 4-8 4 8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display font-bold text-trail-800 text-sm tracking-tight">
              GPX Mapper
            </span>
            <button
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="text-xs font-bold text-trail-600 border border-trail-200 rounded-lg
                px-2 py-1 min-h-[32px] active:scale-95 transition-transform"
              aria-label={t.switchLang}
            >
              {t.switchLang}
            </button>
          </div>

          {/* Controles de zoom + capa — columna derecha */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex flex-col bg-white/90 backdrop-blur-sm
              rounded-2xl shadow-lg overflow-hidden">
              <ZoomButton delta={1} label="+" />
              <div className="h-px bg-gray-100" />
              <ZoomButton delta={-1} label="−" />
            </div>
            <LayerControl />
          </div>
        </div>
      </header>

      {/* Drawer inferior */}
      <RouteDrawer />
    </div>
  )
}

// ── Botón de zoom que delega al mapa Leaflet ───────────────────────────────────
function ZoomButton({ delta, label }: Readonly<{ delta: number; label: string }>) {
  const t = useT()
  function handleClick() {
    const map = getMapInstance()
    if (map) map.setZoom(map.getZoom() + delta)
  }

  return (
    <button
      onClick={handleClick}
      className="w-11 h-11 flex items-center justify-center text-xl font-bold
        text-gray-700 hover:bg-trail-50 active:bg-trail-100 transition-colors"
      aria-label={delta > 0 ? t.zoomIn : t.zoomOut}
    >
      {label}
    </button>
  )
}

// Fin de App.tsx
