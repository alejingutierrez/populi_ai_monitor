import { ExclamationTriangleIcon, MapPinIcon } from '@heroicons/react/24/outline'
import type { FC } from 'react'
import type { CityInsight } from '../data/geoInsights'

interface Props {
  insights: CityInsight[]
  totalPosts: number
  selectedCity?: CityInsight | null
}

const fullFormatter = new Intl.NumberFormat('es-PR')

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const GeoTerritoryIntel: FC<Props> = ({ insights, totalPosts, selectedCity }) => {
  const hotspots = insights.slice(0, 4).map((insight) => {
    const share = totalPosts ? (insight.total / totalPosts) * 100 : 0
    const delta = pctChange(insight.lastDayCount, insight.prevDayCount)
    return { ...insight, share, delta }
  })

  const minVolume = Math.max(10, Math.round(totalPosts * 0.01))
  const alerts = insights
    .filter((insight) => insight.total >= minVolume)
    .flatMap((insight) => {
      const negativeShare = insight.total
        ? (insight.sentiments.negativo / insight.total) * 100
        : 0
      const growth = pctChange(insight.lastDayCount, insight.prevDayCount)
      const items: { label: string; tone: string }[] = []
      if (negativeShare >= 40) {
        items.push({
          label: `Negatividad alta en ${insight.city}`,
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        })
      }
      if (growth >= 30) {
        items.push({
          label: `Crecimiento acelerado en ${insight.city}`,
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        })
      }
      if (insight.riskScore >= 65) {
        items.push({
          label: `Riesgo reputacional en ${insight.city}`,
          tone: 'border-amber-200 bg-amber-50 text-amber-700',
        })
      }
      return items
    })
    .slice(0, 3)

  return (
    <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0'>
      <div className='flex items-center gap-2'>
        <MapPinIcon className='h-4 w-4 text-prBlue' />
        <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>
          Hotspots y alertas
        </p>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
        <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>
          {selectedCity ? `Foco: ${selectedCity.city}` : 'Cobertura general'}
        </span>
      </div>
      <div className='mt-3 space-y-2'>
        {hotspots.map((city) => (
          <div
            key={city.id}
            className='flex items-center justify-between gap-2 text-xs text-slate-600 min-w-0'
          >
            <span className='font-semibold text-slate-700 truncate' title={city.city}>
              {city.city}
            </span>
            <span className='shrink-0'>
              {city.share.toFixed(0)}% · {fullFormatter.format(city.total)}
            </span>
            <span
              className={`shrink-0 text-[11px] font-semibold ${
                city.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {city.delta >= 0 ? '+' : ''}
              {city.delta.toFixed(0)}%
            </span>
          </div>
        ))}
        {!hotspots.length ? (
          <p className='text-xs text-slate-500'>Sin hotspots disponibles.</p>
        ) : null}
      </div>
      <div className='mt-3'>
        <div className='flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>
          <ExclamationTriangleIcon className='h-3.5 w-3.5' />
          Alertas territoriales
        </div>
        <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold'>
          {alerts.length ? (
            alerts.map((alert) => (
              <span key={alert.label} className={`rounded-full border px-2.5 py-1 ${alert.tone}`}>
                {alert.label}
              </span>
            ))
          ) : (
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600'>
              Sin alertas criticas
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default GeoTerritoryIntel
