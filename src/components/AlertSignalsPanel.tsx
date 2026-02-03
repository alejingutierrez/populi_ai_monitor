import { useMemo, type FC } from 'react'
import {
  defaultAlertThresholds,
  type Alert,
  type AlertRuleValue,
  type AlertSignalType,
} from '../data/alerts'

interface Props {
  alert?: Alert | null
}

const signalThresholdFallback: Record<AlertSignalType, number> = {
  volume: defaultAlertThresholds.volumeSpikePct,
  negativity: defaultAlertThresholds.negativityPct,
  risk: defaultAlertThresholds.riskScore,
  viral: defaultAlertThresholds.viralImpactRatio,
  sentiment_shift: defaultAlertThresholds.sentimentShiftPct,
  topic_novelty: defaultAlertThresholds.topicNoveltyPct,
  cross_platform: defaultAlertThresholds.crossPlatformMinPlatforms,
  coordination: defaultAlertThresholds.coordinationRatio,
  geo_expansion: defaultAlertThresholds.geoSpreadDeltaPct,
}

const formatRuleValue = (rule: AlertRuleValue | undefined, rawValue: number) => {
  if (!rule) return `${rawValue.toFixed(1)}`
  if (typeof rule.deltaPct === 'number') return `Δ ${rule.deltaPct.toFixed(1)}%`
  if (typeof rule.zScore === 'number') return `z ${rule.zScore.toFixed(1)}`
  if (Number.isFinite(rule.value)) return `${rule.value.toFixed(1)}`
  return '—'
}

const AlertSignalsPanel: FC<Props> = ({ alert }) => {
  const signals = useMemo(() => {
    if (!alert) return []
    const entries = alert.signals.map((signal) => {
      const rule = alert.ruleValues?.[signal.type]
      const value =
        rule?.deltaPct ?? rule?.zScore ?? rule?.value ?? signal.value ?? 0
      const threshold =
        rule?.deltaThreshold ??
        rule?.zThreshold ??
        rule?.threshold ??
        signalThresholdFallback[signal.type]
      const ratio = threshold ? Math.abs(value) / threshold : 0
      return {
        id: signal.type,
        label: signal.label,
        value,
        threshold,
        ratio,
        displayValue: formatRuleValue(rule, value),
      }
    })
    return entries.sort((a, b) => b.ratio - a.ratio)
  }, [alert])

  if (!alert) {
    return (
      <section className='card p-4'>
        <div className='card-header'>
          <p className='h-section'>Señales y contribución</p>
        </div>
        <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
          Selecciona una alerta para ver la contribución de señales.
        </div>
      </section>
    )
  }

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-3 flex-col'>
        <div>
          <p className='muted'>Alert Intel</p>
          <p className='h-section'>Señales y contribución</p>
          <p className='text-xs text-slate-500 mt-1'>
            Qué señales pesan más en la alerta seleccionada.
          </p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          {alert.title}
        </span>
      </div>

      <div className='space-y-3'>
        {signals.map((signal) => (
          <div key={signal.id} className='space-y-1'>
            <div className='flex items-center justify-between text-xs font-semibold text-slate-600'>
              <span>{signal.label}</span>
              <span>
                {signal.displayValue}
                {Number.isFinite(signal.threshold) ? ` / ${signal.threshold}` : ''}
              </span>
            </div>
            <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
              <div
                className='h-full rounded-full bg-prBlue'
                style={{ width: `${Math.min(100, signal.ratio * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AlertSignalsPanel
