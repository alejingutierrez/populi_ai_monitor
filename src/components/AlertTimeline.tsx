import { useMemo, type FC } from 'react'
import type { AlertRuleStat, AlertTimelinePoint } from '../data/alerts'

interface Props {
  timeline: AlertTimelinePoint[]
  rules: AlertRuleStat[]
  showRules?: boolean
}

const severityColor: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-400',
}

const AlertTimeline: FC<Props> = ({ timeline, rules, showRules = true }) => {
  const totalAlerts = useMemo(
    () => timeline.reduce((acc, point) => acc + point.total, 0),
    [timeline]
  )
  const criticalTotal = useMemo(
    () => timeline.reduce((acc, point) => acc + point.critical, 0),
    [timeline]
  )
  const maxTotal = useMemo(
    () => Math.max(1, ...timeline.map((point) => point.total)),
    [timeline]
  )
  const peakPoint = useMemo(() => {
    if (!timeline.length) return null
    return timeline.reduce((peak, point) => (point.total > peak.total ? point : peak), timeline[0])
  }, [timeline])

  const trendLabel = useMemo(() => {
    if (timeline.length < 4) return 'Sin tendencia clara'
    const split = Math.floor(timeline.length / 2)
    const first = timeline.slice(0, split)
    const last = timeline.slice(split)
    const firstAvg =
      first.reduce((acc, point) => acc + point.total, 0) / Math.max(1, first.length)
    const lastAvg =
      last.reduce((acc, point) => acc + point.total, 0) / Math.max(1, last.length)
    if (lastAvg > firstAvg * 1.15) return 'Tendencia al alza'
    if (lastAvg < firstAvg * 0.85) return 'Tendencia a la baja'
    return 'Estable'
  }, [timeline])

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => b.activeCount - a.activeCount),
    [rules]
  )

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-4 flex-col md:flex-row md:items-center'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Timeline operativo</p>
          <p className='text-xs text-slate-500 mt-1'>Actividad por ventana y reglas activas</p>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
          <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>
            Total {totalAlerts}
          </span>
          <span className='rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700'>
            Críticas {criticalTotal}
          </span>
          <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1'>
            {trendLabel}
          </span>
        </div>
      </div>

      <div className={`grid gap-4 ${showRules ? 'xl:grid-cols-[1.4fr_1fr]' : ''}`}>
        <div className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Alertas
              </p>
              <p className='text-lg font-semibold text-ink'>{totalAlerts}</p>
              <p className='text-[11px] text-slate-500'>Ventana actual</p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Severidad crítica
              </p>
              <p className='text-lg font-semibold text-ink'>
                {totalAlerts ? Math.round((criticalTotal / totalAlerts) * 100) : 0}%
              </p>
              <p className='text-[11px] text-slate-500'>{criticalTotal} alertas</p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Día pico
              </p>
              <p className='text-lg font-semibold text-ink'>{peakPoint?.day ?? '—'}</p>
              <p className='text-[11px] text-slate-500'>{peakPoint?.total ?? 0} alertas</p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Ventana
              </p>
              <p className='text-lg font-semibold text-ink'>{timeline.length} días</p>
              <p className='text-[11px] text-slate-500'>Cobertura temporal</p>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            {totalAlerts ? (
              <>
                <div className='flex items-end gap-2 h-32'>
                  {timeline.map((point, index) => {
                    const height = Math.max(8, (point.total / maxTotal) * 100)
                    const showLabel = index % 2 === 0 || timeline.length <= 8
                    return (
                      <div key={point.day} className='flex-1 flex flex-col items-center gap-2'>
                        <div
                          className='w-full rounded-full bg-slate-100 flex flex-col justify-end overflow-hidden'
                          style={{ height: `${height}%` }}
                          title={`${point.total} alertas`}
                        >
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
                        </div>
                        <span className='text-[10px] text-slate-500'>
                          {showLabel ? point.day : ''}
                        </span>
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
              </>
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
                No hay activaciones recientes en este rango.
              </div>
            )}
          </div>
        </div>

        {showRules ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Reglas activas
              </p>
              <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600'>
                {sortedRules.reduce((acc, rule) => acc + rule.activeCount, 0)} señales
              </span>
            </div>
            <div className='space-y-2 max-h-[300px] overflow-y-auto pr-1'>
              {sortedRules.length ? (
                sortedRules.map((rule) => {
                  const share = totalAlerts
                    ? Math.round((rule.activeCount / totalAlerts) * 100)
                    : 0
                  return (
                    <div
                      key={rule.id}
                      className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
                    >
                      <div className='flex items-center justify-between gap-2 text-xs text-slate-600'>
                        <span className='font-semibold text-slate-700'>{rule.label}</span>
                        <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
                          {rule.activeCount} · {share}%
                        </span>
                      </div>
                      <p className='mt-1 text-[11px] text-slate-500'>Umbral: {rule.threshold}</p>
                    </div>
                  )
                })
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500'>
                  Sin reglas activas en este rango.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default AlertTimeline
