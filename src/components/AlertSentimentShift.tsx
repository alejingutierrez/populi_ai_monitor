import { useMemo, type FC } from 'react'
import { defaultAlertThresholds, type Alert, type AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
  prevAlerts: Alert[]
}

type MetricKey = 'negativeShare' | 'riskScore'
type BandKey = 'low' | 'watch' | 'high'

const statusLabels: Record<AlertStatus, string> = {
  open: 'Nueva',
  ack: 'En investigación',
  snoozed: 'Pospuesta',
  resolved: 'Resuelta',
  escalated: 'Escalada',
}

const statusTone: Record<AlertStatus, string> = {
  open: 'border-slate-200 bg-white text-slate-600',
  ack: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  snoozed: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  escalated: 'border-rose-200 bg-rose-50 text-rose-700',
}

const severityTone: Record<Alert['severity'], string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  medium: 'border-sky-200 bg-sky-50 text-sky-700',
  low: 'border-slate-200 bg-slate-100 text-slate-600',
}

const severityLabels: Record<Alert['severity'], string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const bandMeta: Record<
  BandKey,
  { label: string; tone: string; barTone: string }
> = {
  low: {
    label: 'Baja',
    tone: 'text-emerald-700',
    barTone: 'bg-emerald-500',
  },
  watch: {
    label: 'Vigilancia',
    tone: 'text-amber-700',
    barTone: 'bg-amber-500',
  },
  high: {
    label: 'Alta',
    tone: 'text-rose-700',
    barTone: 'bg-rose-500',
  },
}

const formatValue = (value: number, suffix = '', digits = 1) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—'

const formatSigned = (value: number, digits = 1, suffix = '') => {
  if (!Number.isFinite(value) || value === 0) return `0${suffix}`
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
}

const countFormatter = new Intl.NumberFormat('es-PR')

const activeStatus = (status: AlertStatus) =>
  status === 'open' || status === 'ack' || status === 'escalated'

const weightedAverage = (alerts: Alert[], key: MetricKey) => {
  let weightSum = 0
  let total = 0
  alerts.forEach((alert) => {
    const weight = alert.metrics.volumeCurrent || 1
    weightSum += weight
    total += alert.metrics[key] * weight
  })
  return weightSum ? total / weightSum : 0
}

const bandOf = (value: number, threshold: number): BandKey => {
  if (value >= threshold) return 'high'
  if (value >= threshold * 0.7) return 'watch'
  return 'low'
}

const buildDistribution = (alerts: Alert[], key: MetricKey, threshold: number) => {
  const base: Record<BandKey, number> = { low: 0, watch: 0, high: 0 }
  alerts.forEach((alert) => {
    base[bandOf(alert.metrics[key], threshold)] += 1
  })
  return base
}

const severityWeight = (severity: Alert['severity']) => {
  if (severity === 'critical') return 1.35
  if (severity === 'high') return 1.15
  if (severity === 'medium') return 1
  return 0.85
}

const AlertSentimentShift: FC<Props> = ({ alerts, prevAlerts }) => {
  const negThreshold = defaultAlertThresholds.negativityPct
  const riskThreshold = defaultAlertThresholds.riskScore

  const stats = useMemo(() => {
    const currentNeg = weightedAverage(alerts, 'negativeShare')
    const prevNeg = weightedAverage(prevAlerts, 'negativeShare')
    const currentRisk = weightedAverage(alerts, 'riskScore')
    const prevRisk = weightedAverage(prevAlerts, 'riskScore')

    const negDelta = currentNeg - prevNeg
    const riskDelta = currentRisk - prevRisk

    const currentRedZoneCount = alerts.filter(
      (alert) =>
        alert.metrics.negativeShare >= negThreshold && alert.metrics.riskScore >= riskThreshold
    ).length
    const prevRedZoneCount = prevAlerts.filter(
      (alert) =>
        alert.metrics.negativeShare >= negThreshold && alert.metrics.riskScore >= riskThreshold
    ).length
    const activeRedZoneCount = alerts.filter(
      (alert) =>
        activeStatus(alert.status) &&
        alert.metrics.negativeShare >= negThreshold &&
        alert.metrics.riskScore >= riskThreshold
    ).length

    const prevById = new Map(prevAlerts.map((alert) => [alert.id, alert]))
    const rows = alerts.map((alert) => {
      const prev = prevById.get(alert.id)
      const negPrev = prev?.metrics.negativeShare
      const riskPrev = prev?.metrics.riskScore
      const negChange = typeof negPrev === 'number' ? alert.metrics.negativeShare - negPrev : null
      const riskChange = typeof riskPrev === 'number' ? alert.metrics.riskScore - riskPrev : null
      const weightedShift =
        (Math.max(0, negChange ?? 0) * 0.55 + Math.max(0, riskChange ?? 0) * 0.45) *
        severityWeight(alert.severity)
      const weightedImprove =
        (Math.min(0, negChange ?? 0) * 0.55 + Math.min(0, riskChange ?? 0) * 0.45) *
        severityWeight(alert.severity)
      return {
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        status: alert.status,
        negCurrent: alert.metrics.negativeShare,
        riskCurrent: alert.metrics.riskScore,
        negChange,
        riskChange,
        hasPrevious: Boolean(prev),
        weightedShift,
        weightedImprove,
      }
    })

    const worsening = rows
      .filter(
        (item) =>
          (item.negChange ?? 0) > 0 || (item.riskChange ?? 0) > 0 || (!item.hasPrevious && item.weightedShift > 0)
      )
      .sort((a, b) => b.weightedShift - a.weightedShift)
      .slice(0, 4)

    const improving = rows
      .filter((item) => (item.negChange ?? 0) < 0 || (item.riskChange ?? 0) < 0)
      .sort((a, b) => a.weightedImprove - b.weightedImprove)
      .slice(0, 4)

    return {
      currentNeg,
      prevNeg,
      currentRisk,
      prevRisk,
      negDelta,
      riskDelta,
      negDistribution: buildDistribution(alerts, 'negativeShare', negThreshold),
      prevNegDistribution: buildDistribution(prevAlerts, 'negativeShare', negThreshold),
      riskDistribution: buildDistribution(alerts, 'riskScore', riskThreshold),
      prevRiskDistribution: buildDistribution(prevAlerts, 'riskScore', riskThreshold),
      currentRedZoneCount,
      prevRedZoneCount,
      activeRedZoneCount,
      worsening,
      improving,
    }
  }, [alerts, prevAlerts, negThreshold, riskThreshold])

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-3 flex-col lg:flex-row lg:items-center'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Shift de sentimiento y riesgo</p>
          <p className='text-xs text-slate-500 mt-1'>
            Lectura comparativa real por ventana: deltas ponderados, bandas de exposición y alertas driver.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
          <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>
            Umbral neg {negThreshold}%
          </span>
          <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>
            Umbral riesgo {riskThreshold} pts
          </span>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        <div className='rounded-2xl border border-prRed/20 bg-gradient-to-br from-prRed/10 via-white to-white px-3 py-2.5 shadow-sm'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
            <span>Negatividad ponderada</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                stats.negDelta <= 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              Δ {formatSigned(stats.negDelta, 1, 'pp')}
            </span>
          </div>
          <p className='mt-1 text-lg font-semibold text-ink'>{formatValue(stats.currentNeg, '%')}</p>
          <p className='text-[11px] text-slate-500'>Prev {formatValue(stats.prevNeg, '%')}</p>
        </div>

        <div className='rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white px-3 py-2.5 shadow-sm'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
            <span>Riesgo ponderado</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                stats.riskDelta <= 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              Δ {formatSigned(stats.riskDelta, 1)}
            </span>
          </div>
          <p className='mt-1 text-lg font-semibold text-ink'>{formatValue(stats.currentRisk)}</p>
          <p className='text-[11px] text-slate-500'>Prev {formatValue(stats.prevRisk)}</p>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-white px-3 py-2.5 shadow-sm sm:col-span-2 xl:col-span-1'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
            <span>Zona crítica (neg+risk)</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                stats.currentRedZoneCount <= stats.prevRedZoneCount
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              Δ {formatSigned(stats.currentRedZoneCount - stats.prevRedZoneCount, 0)}
            </span>
          </div>
          <p className='mt-1 text-lg font-semibold text-ink'>
            {countFormatter.format(stats.currentRedZoneCount)}
          </p>
          <p className='text-[11px] text-slate-500'>
            {countFormatter.format(stats.activeRedZoneCount)} activas en rojo
          </p>
        </div>
      </div>

      <div className='mt-3 grid gap-3 xl:grid-cols-[1.25fr_1fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Distribución por bandas
          </p>

          <div className='mt-2 space-y-2'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold'>
              Negatividad
            </p>
            {(['low', 'watch', 'high'] as BandKey[]).map((band) => {
              const current = stats.negDistribution[band]
              const previous = stats.prevNegDistribution[band]
              const currentPct = alerts.length ? (current / alerts.length) * 100 : 0
              const previousPct = prevAlerts.length ? (previous / prevAlerts.length) * 100 : 0
              return (
                <div key={`neg-band-${band}`} className='rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2'>
                  <div className='flex items-center justify-between gap-2 text-[11px] font-semibold'>
                    <span className={bandMeta[band].tone}>{bandMeta[band].label}</span>
                    <span className='text-slate-600'>
                      {countFormatter.format(current)} · prev {countFormatter.format(previous)}
                    </span>
                  </div>
                  <div className='mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden'>
                    <div className={`h-full ${bandMeta[band].barTone}`} style={{ width: `${currentPct}%` }} />
                  </div>
                  <p className='mt-1 text-[10px] text-slate-500'>
                    Actual {currentPct.toFixed(0)}% · previo {previousPct.toFixed(0)}%
                  </p>
                </div>
              )
            })}
          </div>

          <div className='mt-3 space-y-2'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold'>
              Riesgo
            </p>
            {(['low', 'watch', 'high'] as BandKey[]).map((band) => {
              const current = stats.riskDistribution[band]
              const previous = stats.prevRiskDistribution[band]
              const currentPct = alerts.length ? (current / alerts.length) * 100 : 0
              const previousPct = prevAlerts.length ? (previous / prevAlerts.length) * 100 : 0
              return (
                <div key={`risk-band-${band}`} className='rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2'>
                  <div className='flex items-center justify-between gap-2 text-[11px] font-semibold'>
                    <span className={bandMeta[band].tone}>{bandMeta[band].label}</span>
                    <span className='text-slate-600'>
                      {countFormatter.format(current)} · prev {countFormatter.format(previous)}
                    </span>
                  </div>
                  <div className='mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden'>
                    <div className={`h-full ${bandMeta[band].barTone}`} style={{ width: `${currentPct}%` }} />
                  </div>
                  <p className='mt-1 text-[10px] text-slate-500'>
                    Actual {currentPct.toFixed(0)}% · previo {previousPct.toFixed(0)}%
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Drivers del shift
          </p>

          <div className='mt-2 space-y-2'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-rose-600 font-semibold'>
              Empeoran
            </p>
            {stats.worsening.length ? (
              stats.worsening.map((item) => (
                <div key={`worse-${item.id}`} className='rounded-xl border border-rose-200 bg-rose-50/50 px-2.5 py-2'>
                  <p className='text-xs font-semibold text-ink truncate' title={item.title}>
                    {item.title}
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600'>
                    <span className={`rounded-full border px-2 py-0.5 ${severityTone[item.severity]}`}>
                      {severityLabels[item.severity]}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusTone[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                    <span className='text-rose-700'>
                      Neg {item.negChange === null ? 'Nueva' : formatSigned(item.negChange, 1, 'pp')}
                    </span>
                    <span className='text-rose-700'>
                      Riesgo {item.riskChange === null ? 'Nueva' : formatSigned(item.riskChange, 1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700'>
                No hay empeoramientos relevantes contra la ventana previa.
              </p>
            )}
          </div>

          <div className='mt-3 space-y-2'>
            <p className='text-[10px] uppercase tracking-[0.14em] text-emerald-700 font-semibold'>
              Mejoran
            </p>
            {stats.improving.length ? (
              stats.improving.map((item) => (
                <div key={`better-${item.id}`} className='rounded-xl border border-emerald-200 bg-emerald-50/50 px-2.5 py-2'>
                  <p className='text-xs font-semibold text-ink truncate' title={item.title}>
                    {item.title}
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600'>
                    <span className={`rounded-full border px-2 py-0.5 ${severityTone[item.severity]}`}>
                      {severityLabels[item.severity]}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusTone[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                    <span className='text-emerald-700'>
                      Neg {item.negChange === null ? '—' : formatSigned(item.negChange, 1, 'pp')}
                    </span>
                    <span className='text-emerald-700'>
                      Riesgo {item.riskChange === null ? '—' : formatSigned(item.riskChange, 1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className='rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600'>
                Sin mejoras significativas en esta ventana.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AlertSentimentShift
