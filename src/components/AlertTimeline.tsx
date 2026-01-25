import type { FC } from 'react'
import type { AlertRuleStat, AlertTimelinePoint } from '../data/alerts'

interface Props {
  timeline: AlertTimelinePoint[]
  rules: AlertRuleStat[]
}

const severityColor: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-400',
}

const AlertTimeline: FC<Props> = ({ timeline, rules }) => {
  const maxTotal = Math.max(1, ...timeline.map((point) => point.total))

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-4 flex-col md:flex-row md:items-center'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Timeline y reglas</p>
          <p className='text-xs text-slate-500 mt-1'>Salud operativa por ventana</p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          Activaciones recientes
        </span>
      </div>

      <div className='grid gap-4 xl:grid-cols-[1.3fr_1fr]'>
        <div>
          <div className='flex items-end gap-2 h-28'>
            {timeline.map((point) => {
              const height = Math.max(6, (point.total / maxTotal) * 100)
              const hasTotal = point.total > 0
              return (
                <div key={point.day} className='flex-1 flex flex-col items-center gap-2'>
                  <div
                    className='w-full rounded-full bg-slate-100 flex flex-col justify-end overflow-hidden'
                    style={{ height: `${height}%` }}
                    title={`${point.total} alertas`}
                  >
                    {hasTotal ? (
                      <>
                        {point.low ? (
                          <div
                            className={severityColor.low}
                            style={{ height: `${(point.low / point.total) * 100}%` }}
                          />
                        ) : null}
                        {point.medium ? (
                          <div
                            className={severityColor.medium}
                            style={{ height: `${(point.medium / point.total) * 100}%` }}
                          />
                        ) : null}
                        {point.high ? (
                          <div
                            className={severityColor.high}
                            style={{ height: `${(point.high / point.total) * 100}%` }}
                          />
                        ) : null}
                        {point.critical ? (
                          <div
                            className={severityColor.critical}
                            style={{ height: `${(point.critical / point.total) * 100}%` }}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className='h-full w-full bg-slate-200/60' />
                    )}
                  </div>
                  <span className='text-[10px] text-slate-500'>{point.day}</span>
                </div>
              )
            })}
          </div>
          <div className='mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600'>
            <span className='rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700'>
              Crítica
            </span>
            <span className='rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700'>
              Alta
            </span>
            <span className='rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700'>
              Media
            </span>
            <span className='rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-600'>
              Baja
            </span>
          </div>
        </div>

        <div className='space-y-3'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Reglas activas
          </p>
          <div className='space-y-2'>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
              >
                <div className='flex items-center justify-between gap-2 text-xs text-slate-600'>
                  <span className='font-semibold text-slate-700'>{rule.label}</span>
                  <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600'>
                    {rule.activeCount} activas
                  </span>
                </div>
                <p className='mt-1 text-[11px] text-slate-500'>Umbral: {rule.threshold}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AlertTimeline
