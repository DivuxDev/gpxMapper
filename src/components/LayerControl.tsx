import { useState } from 'react'
import { useRouteStore } from '../store/useRouteStore'
import type { MapLayer, RoutingProfile } from '../types'

const LAYERS: { key: MapLayer; label: string; emoji: string }[] = [
  { key: 'osm', label: 'Mapa', emoji: '🗺️' },
  { key: 'topo', label: 'Topo', emoji: '⛰️' },
  { key: 'satellite', label: 'Satélite', emoji: '🛰️' },
]

const PROFILES: { key: RoutingProfile; label: string; emoji: string }[] = [
  { key: 'foot', label: 'Trail', emoji: '🥾' },
  { key: 'bike', label: 'Bici', emoji: '🚴' },
  { key: 'mtb', label: 'MTB', emoji: '🚵' },
  { key: 'racingbike', label: 'Road', emoji: '🏎️' },
]

export function LayerControl() {
  const [open, setOpen] = useState(false)
  const activeLayer = useRouteStore((s) => s.activeLayer)
  const setActiveLayer = useRouteStore((s) => s.setActiveLayer)
  const routingProfile = useRouteStore((s) => s.routingProfile)
  const setRoutingProfile = useRouteStore((s) => s.setRoutingProfile)

  const currentLayer = LAYERS.find((l) => l.key === activeLayer)!

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-gray-100 text-sm font-medium
          active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
        title="Capas y perfil"
      >
        <span>{currentLayer.emoji}</span>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute bottom-full mb-2 left-0 z-20 bg-white rounded-2xl shadow-xl
            border border-gray-100 p-3 w-56">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capa</p>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {LAYERS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => { setActiveLayer(l.key); }}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs font-medium
                    transition-colors min-h-[44px]
                    ${activeLayer === l.key
                      ? 'bg-trail-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-trail-50'}`}
                >
                  <span className="text-base">{l.emoji}</span>
                  {l.label}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Perfil</p>
            <div className="grid grid-cols-2 gap-1">
              {PROFILES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setRoutingProfile(p.key); setOpen(false); }}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium
                    transition-colors min-h-[44px]
                    ${routingProfile === p.key
                      ? 'bg-trail-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-trail-50'}`}
                >
                  <span>{p.emoji}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
