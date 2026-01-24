import type { FC } from 'react'
import type { CityInsight } from '../data/geoInsights'

interface SentimentTotals {
  positivo: number
  neutral: number
  negativo: number
}

interface Props {
  insights: CityInsight[]
  totals: SentimentTotals
}

const GeoSentimentPanel: FC<Props> = ({ insights, totals }) => {
  const total = totals.positivo + totals.neutral + totals.negativo || 1
  const negativeHotspots = insights
    .map((insight) => ({
      id: insight.id,
      city: insight.city,
      negativeShare: insight.total
        ? (insight.sentiments.negativo / insight.total) * 100
        : 0,
      total: insight.total,
    }))
    .filter((item) => item.total >= 8)
    .sort((a, b) => b.negativeShare - a.negativeShare)
    .slice(0, 3)

  return (
    <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0'>
      <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>
        Pulso de sentimiento
      </p>
      <div className='mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden'>
        <div
          className='h-full bg-emerald-500'
          style={{ width: `${(totals.positivo / total) * 100}%` }}
        />
        <div
          className='h-full bg-slate-300'
          style={{ width: `${(totals.neutral / total) * 100}%` }}
        />
        <div
          className='h-full bg-rose-500'
          style={{ width: `${(totals.negativo / total) * 100}%` }}
        />
      </div>
      <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold'>
        <span className='rounded-full bg-emerald-50 px-2 py-1 text-emerald-700'>
          Positivo {Math.round((totals.positivo / total) * 100)}%
        </span>
        <span className='rounded-full bg-slate-100 px-2 py-1 text-slate-600'>
          Neutral {Math.round((totals.neutral / total) * 100)}%
        </span>
        <span className='rounded-full bg-rose-50 px-2 py-1 text-rose-700'>
          Negativo {Math.round((totals.negativo / total) * 100)}%
        </span>
      </div>
      <div className='mt-3 space-y-2'>
        {negativeHotspots.map((item) => (
          <div
            key={item.id}
            className='flex items-center justify-between gap-2 text-xs text-slate-600 min-w-0'
          >
            <span className='font-semibold text-slate-700 truncate' title={item.city}>
              {item.city}
            </span>
            <span className='shrink-0 text-rose-600'>
              {item.negativeShare.toFixed(0)}%
            </span>
          </div>
        ))}
        {!negativeHotspots.length ? (
          <p className='text-xs text-slate-500'>Sin zonas criticas por sentimiento.</p>
        ) : null}
      </div>
    </div>
  )
}

export default GeoSentimentPanel
