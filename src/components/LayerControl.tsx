import { useState } from 'react'
import { useRouteStore } from '../store/useRouteStore'
import type { MapLayer } from '../types'

const LAYERS: { key: MapLayer; label: string; emoji: string }[] = [
  { key: 'osm',      label: 'Mapa',    emoji: '🗺️' },
  { key: 'topo',     label: 'Topo',    emoji: '⛰️' },
  { key: 'satellite',label: 'Satélite',emoji: '🛰️' },
  { key: 'cycle',    label: 'Ciclismo',emoji: '🚴' },
  { key: 'esritopo', label: 'Relieve', emoji: '🌍' },
]

export function LayerControl() {
  const [open, setOpen] = useState(false)
  const activeLayer = useRouteStore((s) => s.activeLayer)
  const setActiveLayer = useRouteStore((s) => s.setActiveLayer)

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
          <button
            type="button"
            aria-label="Cerrar capas"
            className="fixed inset-0 z-10 w-full h-full cursor-default"
            onClick={() => setOpen(false)}
          />

          {/* Panel — se abre hacia abajo, alineado a la derecha */}
          <div className="absolute top-full mt-2 right-0 z-20 bg-white rounded-2xl shadow-xl
            border border-gray-100 p-3 w-64">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capa</p>
            <div className="grid grid-cols-3 gap-1">
              {LAYERS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => { setActiveLayer(l.key); setOpen(false) }}
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
          </div>
        </>
      )}
    </div>
  )
}
