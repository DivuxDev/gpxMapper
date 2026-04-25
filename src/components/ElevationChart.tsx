import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { ElevationPoint } from '../types'

interface ElevationChartProps {
  data: ElevationPoint[]
}

interface TooltipPayloadItem {
  value: number
  payload: ElevationPoint
}

// ── Tooltip personalizado ──────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const { distance, elevation } = payload[0].payload
  return (
    <div className="bg-white/95 border border-trail-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-trail-700">{elevation.toFixed(0)} m</p>
      <p className="text-gray-500">{distance.toFixed(2)} km</p>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function ElevationChart({ data }: ElevationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Añade puntos al mapa para ver el perfil de elevación
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" vertical={false} />
        <XAxis
          dataKey="distance"
          tickFormatter={(v: number) => `${v.toFixed(1)}km`}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey="elevation"
          tickFormatter={(v: number) => `${v}m`}
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="elevation"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#elevGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#16a34a', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
