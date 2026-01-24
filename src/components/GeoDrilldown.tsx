import type { FC } from 'react'
import type { CityInsight } from '../data/geoInsights'

interface Props {
  insights: CityInsight[]
  totalPosts: number
  selectedCityId?: string | null
  onSelectCity?: (insight: CityInsight) => void
}

const fullFormatter = new Intl.NumberFormat('es-PR')

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const GeoDrilldown: FC<Props> = ({
  insights,
  totalPosts,
  selectedCityId,
  onSelectCity,
}) => {
  const rows = insights.slice(0, 10).map((insight) => {
    const share = totalPosts ? (insight.total / totalPosts) * 100 : 0
    const delta = pctChange(insight.lastDayCount, insight.prevDayCount)
    const netSentiment = insight.sentiments.positivo - insight.sentiments.negativo
    return { ...insight, share, delta, netSentiment }
  })

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-4 flex-col md:flex-row md:items-center'>
        <div>
          <p className='muted'>Geo Tagging</p>
          <p className='h-section'>Drilldown territorial</p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          Top municipios
        </span>
      </div>
      <div className='grid gap-2'>
        <div className='hidden sm:grid grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr] text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] px-3'>
          <span>Municipio</span>
          <span className='text-right'>Volumen</span>
          <span className='text-right'>Sentimiento neto</span>
          <span className='text-right'>Δ 24h</span>
        </div>
        {rows.map((row) => {
          const active = row.id === selectedCityId
          return (
            <button
              key={row.id}
              type='button'
              onClick={() => onSelectCity?.(row)}
              className={`grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr] items-center rounded-2xl border px-3 py-2 text-left text-xs transition ${
                active
                  ? 'border-prBlue bg-prBlue/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className='min-w-0'>
                <div className='flex items-center justify-between gap-2 sm:block'>
                  <span className='font-semibold text-slate-700 truncate' title={row.city}>
                    {row.city}
                  </span>
                  <span className='text-[11px] text-slate-500 sm:hidden'>
                    {fullFormatter.format(row.total)} · {row.share.toFixed(0)}%
                  </span>
                </div>
                <span className='text-[11px] text-slate-500 sm:hidden'>
                  Δ 24h {row.delta >= 0 ? '+' : ''}
                  {row.delta.toFixed(0)}%
                </span>
              </div>
              <span className='hidden sm:block text-right text-slate-600'>
                {fullFormatter.format(row.total)}
              </span>
              <span
                className={`hidden sm:block text-right font-semibold ${
                  row.netSentiment >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {row.netSentiment >= 0 ? '+' : ''}
                {fullFormatter.format(row.netSentiment)}
              </span>
              <span
                className={`hidden sm:block text-right font-semibold ${
                  row.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {row.delta >= 0 ? '+' : ''}
                {row.delta.toFixed(0)}%
              </span>
            </button>
          )
        })}
        {!rows.length ? (
          <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center'>
            Sin datos suficientes para drilldown territorial.
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default GeoDrilldown
