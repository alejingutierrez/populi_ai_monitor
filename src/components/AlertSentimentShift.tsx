import { useMemo, type FC } from 'react'
import { defaultAlertThresholds, type Alert } from '../data/alerts'

interface Props {
  alerts: Alert[]
  prevAlerts: Alert[]
}

const formatValue = (value: number, suffix = '') =>
  Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : '—'

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const buildDeltaBadge = (current: number, prev: number, prefersLower = false) => {
  const delta = pctChange(current, prev)
  const label = prev === 0 && current > 0 ? 'Nuevo' : `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`
  const isGood = prefersLower ? delta <= 0 : delta >= 0
  return {
    label,
    tone: isGood
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700',
  }
}

const weightedAverage = (alerts: Alert[], key: 'negativeShare' | 'riskScore') => {
  let weightSum = 0
  let total = 0
  alerts.forEach((alert) => {
    const weight = alert.metrics.volumeCurrent || 1
    weightSum += weight
    total += alert.metrics[key] * weight
  })
  return weightSum ? total / weightSum : 0
}

const AlertSentimentShift: FC<Props> = ({ alerts, prevAlerts }) => {
  const stats = useMemo(() => {
    const currentNeg = weightedAverage(alerts, 'negativeShare')
    const prevNeg = weightedAverage(prevAlerts, 'negativeShare')
    const currentRisk = weightedAverage(alerts, 'riskScore')
    const prevRisk = weightedAverage(prevAlerts, 'riskScore')
    return {
      currentNeg,
      prevNeg,
      currentRisk,
      prevRisk,
      negBadge: buildDeltaBadge(currentNeg, prevNeg, true),
      riskBadge: buildDeltaBadge(currentRisk, prevRisk, true),
      highNegCount: alerts.filter(
        (alert) => alert.metrics.negativeShare >= defaultAlertThresholds.negativityPct
      ).length,
      highRiskCount: alerts.filter(
        (alert) => alert.metrics.riskScore >= defaultAlertThresholds.riskScore
      ).length,
    }
  }, [alerts, prevAlerts])

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-3 flex-col'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Shift de sentimiento y riesgo</p>
          <p className='text-xs text-slate-500 mt-1'>
            Comparativo contra ventana previa con umbrales críticos.
          </p>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
            <span>Negatividad promedio</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${stats.negBadge.tone}`}>
              {stats.negBadge.label}
            </span>
          </div>
          <p className='text-lg font-semibold text-ink mt-1'>{formatValue(stats.currentNeg, '%')}</p>
          <p className='text-[11px] text-slate-500'>
            {stats.highNegCount} alertas sobre umbral ({defaultAlertThresholds.negativityPct}%)
          </p>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
            <span>Riesgo promedio</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${stats.riskBadge.tone}`}>
              {stats.riskBadge.label}
            </span>
          </div>
          <p className='text-lg font-semibold text-ink mt-1'>{formatValue(stats.currentRisk)}</p>
          <p className='text-[11px] text-slate-500'>
            {stats.highRiskCount} alertas sobre umbral ({defaultAlertThresholds.riskScore} pts)
          </p>
        </div>
      </div>
    </section>
  )
}

export default AlertSentimentShift
