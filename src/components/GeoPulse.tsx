import {
  BoltIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import type { FC } from 'react'

interface GeoPulseStats {
  activeCities: number
  totalPosts: number
  reach: number
  riskScore: number
  rangeLabel: string
  deltas: {
    activeCitiesPct: number
    totalPostsPct: number
    reachPct: number
    riskPct: number
  }
}

interface Props {
  stats: GeoPulseStats
}

const compactFormatter = new Intl.NumberFormat('es-PR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fullFormatter = new Intl.NumberFormat('es-PR')

const formatCompact = (value: number) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '0'

const getTrendTone = (delta: number, prefersLower = false) => {
  const safeDelta = Number.isFinite(delta) ? delta : 0
  const isImprovement = prefersLower ? safeDelta <= 0 : safeDelta >= 0
  return {
    arrow: safeDelta >= 0 ? '▲' : '▼',
    value: Math.abs(safeDelta).toFixed(1),
    tone: isImprovement
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700',
  }
}

const GeoPulse: FC<Props> = ({ stats }) => {
  const cards = [
    {
      label: 'Municipios activos',
      value: fullFormatter.format(stats.activeCities),
      valueTitle: fullFormatter.format(stats.activeCities),
      icon: <MapPinIcon className='h-4 w-4' />,
      delta: stats.deltas.activeCitiesPct,
    },
    {
      label: 'Menciones geo',
      value: formatCompact(stats.totalPosts),
      valueTitle: fullFormatter.format(stats.totalPosts),
      icon: <ChartBarIcon className='h-4 w-4' />,
      delta: stats.deltas.totalPostsPct,
    },
    {
      label: 'Reach territorial',
      value: formatCompact(stats.reach),
      valueTitle: fullFormatter.format(stats.reach),
      icon: <BoltIcon className='h-4 w-4' />,
      delta: stats.deltas.reachPct,
    },
    {
      label: 'Riesgo geo',
      value: `${stats.riskScore.toFixed(1)} / 100`,
      valueTitle: `${stats.riskScore.toFixed(2)} / 100`,
      icon: <ExclamationTriangleIcon className='h-4 w-4' />,
      delta: stats.deltas.riskPct,
      preferLower: true,
    },
  ]

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-4 flex-col md:flex-row md:items-center'>
        <div>
          <p className='muted'>Geo Tagging</p>
          <p className='h-section'>Pulso territorial</p>
          <p className='text-xs text-slate-500 mt-1'>{stats.rangeLabel}</p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          Ventana comparativa
        </span>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        {cards.map((card) => {
          const trend = getTrendTone(card.delta, card.preferLower)
          return (
            <div
              key={card.label}
              className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'
            >
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                    {card.label}
                  </p>
                  <p className='text-lg font-semibold text-ink' title={card.valueTitle}>
                    {card.value}
                  </p>
                </div>
                <div className='rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500'>
                  {card.icon}
                </div>
              </div>
              <div className='mt-2 flex items-center justify-between text-[10px] text-slate-500'>
                <span>Ventana actual</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${trend.tone}`}
                >
                  {trend.arrow} {trend.value}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default GeoPulse
