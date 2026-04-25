import { useRef } from 'react'
import { useRoute } from '../hooks/useRoute'
import { useRouteStore } from '../store/useRouteStore'
import { useT } from '../hooks/useT'
import { ElevationChart } from './ElevationChart'
import { ExportButton } from './ExportButton'
import { formatDistance, formatElevation } from '../utils/formatters'

// ── Pill de estadística ────────────────────────────────────────────────────────
function StatPill({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col items-center bg-trail-50 rounded-xl px-4 py-2 min-w-[80px]">
      <span className="text-xs text-trail-600 font-medium">{label}</span>
      <span className="text-base font-bold text-trail-800">{value}</span>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function RouteDrawer() {
  const drawerOpen = useRouteStore((s) => s.drawerOpen)
  const setDrawerOpen = useRouteStore((s) => s.setDrawerOpen)
  const routingError = useRouteStore((s) => s.routingError)
  const setHoverPoint = useRouteStore((s) => s.setHoverPoint)
  const t = useT()
  const {
    elevationProfile,
    totalDistance,
    totalElevationGain,
    canUndo,
    canRedo,
    undo,
    redo,
    clearRoute,
    waypoints,
  } = useRoute()

  // Drag handle para deslizar el drawer
  const startY = useRef<number | null>(null)
  const startOpen = useRef<boolean>(false)

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
    startOpen.current = drawerOpen
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startY.current == null) return
    const delta = startY.current - e.changedTouches[0].clientY
    startY.current = null
    e.preventDefault() // evita que el browser genere un click sintético posterior
    if (Math.abs(delta) < 20) {
      // Tap → toggle usando el valor capturado al inicio del toque
      setDrawerOpen(!startOpen.current)
    } else {
      // Swipe → dirección
      setDrawerOpen(delta > 0)
    }
  }

  const drawerStyle = drawerOpen
    ? { height: 'calc(16rem + env(safe-area-inset-bottom, 0px))' }
    : { height: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }

  return (
    <div
      style={drawerStyle}
      className="
        fixed bottom-0 left-0 right-0 z-[900]
        bg-white rounded-t-2xl shadow-2xl border-t border-gray-100
        transition-all duration-300 ease-in-out
        flex flex-col
      "
    >
      {/* ── Handle de arrastre ────────────────────────────────────────────────────── */}
      <button
        type="button"
        className="flex justify-center pt-3 pb-1 cursor-pointer flex-shrink-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label={drawerOpen ? t.closePanel : t.openPanel}
      >
        <div className="w-10 h-1.5 rounded-full bg-gray-300" />
      </button>

      {/* ── Barra de estadísticas (siempre visible) ────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-2 gap-2 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <StatPill label={t.statDistance} value={formatDistance(totalDistance)} />
          <StatPill label={t.statElevGain} value={formatElevation(totalElevationGain)} />
          <StatPill label={t.statPoints} value={`${waypoints.length}`} />
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo}
            title={t.undo}
            className="p-2.5 rounded-xl bg-gray-100 disabled:opacity-40 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 14 4 9l5-5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title={t.redo}
            className="p-2.5 rounded-xl bg-gray-100 disabled:opacity-40 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 14 5-5-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Error de routing ───────────────────────────────────────────────── */}
      {routingError && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex-shrink-0">
          ⚠️ {routingError}
        </div>
      )}

      {/* ── Panel expandido ────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="flex flex-col flex-1 min-h-0 px-4 pb-4 gap-3">
          {/* Gráfico de elevación */}
          <div className="flex-1 min-h-0">
            <ElevationChart data={elevationProfile} onHoverPoint={setHoverPoint} />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <ExportButton />
            <button
              onClick={clearRoute}
              className="flex-1 px-3 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium
                active:scale-95 transition-transform min-h-[44px]"
            >
              {t.clear}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
