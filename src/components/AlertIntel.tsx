import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState, type FC } from 'react'
import {
  defaultAlertThresholds,
  type Alert,
  type AlertRuleValue,
  type AlertSignalType,
} from '../data/alerts'

interface Props {
  alert?: Alert | null
  onApplyScope?: (alert: Alert) => void
  onOpenFeedStream?: (alert: Alert) => void
}

const compactFormatter = new Intl.NumberFormat('es-PR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatCompact = (value: number) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '0'

const severityTone: Record<Alert['severity'], string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  medium: 'border-sky-200 bg-sky-50 text-sky-700',
  low: 'border-slate-200 bg-slate-100 text-slate-600',
}

const sentimentTone: Record<string, string> = {
  positivo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  negativo: 'border-rose-200 bg-rose-50 text-rose-700',
}

const ruleCatalog: Record<AlertSignalType, { label: string; threshold: string }> = {
  volume: {
    label: 'Spike de volumen',
    threshold: `≥ ${defaultAlertThresholds.volumeSpikePct}% o z≥${defaultAlertThresholds.volumeZScore}`,
  },
  sentiment_shift: {
    label: 'Cambio de negatividad',
    threshold: `≥ ${defaultAlertThresholds.sentimentShiftPct}%`,
  },
  negativity: {
    label: 'Negatividad alta',
    threshold: `≥ ${defaultAlertThresholds.negativityPct}%`,
  },
  risk: {
    label: 'Riesgo reputacional',
    threshold: `≥ ${defaultAlertThresholds.riskScore} pts`,
  },
  viral: {
    label: 'Viralidad',
    threshold: `≥ ${defaultAlertThresholds.viralImpactRatio}x + ${defaultAlertThresholds.viralDeltaPct}%`,
  },
  topic_novelty: {
    label: 'Temas nuevos',
    threshold: `≥ ${defaultAlertThresholds.topicNoveltyPct}%`,
  },
  cross_platform: {
    label: 'Spike multi-plataforma',
    threshold: `≥ ${defaultAlertThresholds.crossPlatformMinPlatforms} plataformas`,
  },
  coordination: {
    label: 'Coordinación',
    threshold: `≥ ${defaultAlertThresholds.coordinationRatio}%`,
  },
  geo_expansion: {
    label: 'Expansión geográfica',
    threshold: `≥ ${defaultAlertThresholds.geoSpreadDeltaPct}%`,
  },
}

const formatRuleValue = (rule: AlertRuleValue) => {
  if (typeof rule.deltaPct === 'number' && Number.isFinite(rule.deltaPct)) {
    return `${rule.deltaPct.toFixed(1)}%`
  }
  if (typeof rule.zScore === 'number' && Number.isFinite(rule.zScore)) {
    return `z ${rule.zScore.toFixed(1)}`
  }
  if (typeof rule.value === 'number' && Number.isFinite(rule.value)) {
    return rule.value.toFixed(1)
  }
  return '—'
}

const AlertIntel: FC<Props> = ({ alert, onApplyScope, onOpenFeedStream }) => {
  const [expandedEvidence, setExpandedEvidence] = useState(false)
  const ruleRows = useMemo(() => {
    if (!alert) return []
    if (alert.ruleValues) {
      return Object.entries(alert.ruleValues).map(([key, value]) => {
        const typedKey = key as AlertSignalType
        const catalog = ruleCatalog[typedKey]
        return {
          id: key,
          label: catalog?.label ?? key,
          threshold: catalog?.threshold ?? '—',
          value,
        }
      })
    }
    return (alert.ruleIds ?? []).map((key) => {
      const catalog = ruleCatalog[key]
      return {
        id: key,
        label: catalog?.label ?? key,
        threshold: catalog?.threshold ?? '—',
        value: null,
      }
    })
  }, [alert])

  const evidenceItems = useMemo(() => {
    if (!alert) return []
    return expandedEvidence ? alert.evidence.slice(0, 10) : alert.evidence.slice(0, 4)
  }, [alert, expandedEvidence])

  if (!alert) {
    return (
      <section className='card p-4 min-w-0'>
        <div className='card-header'>
          <p className='h-section'>Alert Intel</p>
        </div>
        <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
          Selecciona una alerta para ver el detalle operativo.
        </div>
      </section>
    )
  }

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-3 flex-col'>
        <div className='flex items-start justify-between gap-2 w-full'>
          <div>
            <p className='muted'>Alert Intel</p>
            <p className='h-section'>{alert.title}</p>
            <p className='text-xs text-slate-500 mt-1'>{alert.scopeLabel}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityTone[alert.severity]}`}>
            {alert.severity}
          </span>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
          {alert.signals.map((signal) => (
            <span
              key={`${alert.id}-${signal.type}`}
              className='rounded-full border border-slate-200 bg-white px-2.5 py-1'
            >
              {signal.label}
            </span>
          ))}
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Volumen
          </p>
          <p className='text-lg font-semibold text-ink'>
            {formatCompact(alert.metrics.volumeCurrent)}
          </p>
          <p className='text-[11px] text-slate-500'>
            Δ {alert.metrics.volumeDeltaPct.toFixed(0)}% vs previo
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Negatividad
          </p>
          <p className='text-lg font-semibold text-ink'>
            {alert.metrics.negativeShare.toFixed(0)}%
          </p>
          <p className='text-[11px] text-slate-500'>
            Riesgo {alert.metrics.riskScore.toFixed(0)} / 100
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Impacto
          </p>
          <p className='text-lg font-semibold text-ink'>
            {alert.metrics.impactRatio.toFixed(2)}x
          </p>
          <p className='text-[11px] text-slate-500'>
            Reach {formatCompact(alert.metrics.reach)}
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Engagement
          </p>
          <p className='text-lg font-semibold text-ink'>
            {formatCompact(alert.metrics.engagement)}
          </p>
          <p className='text-[11px] text-slate-500'>
            Tasa {alert.metrics.engagementRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className='mt-3'>
        <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
          Temas dominantes
        </p>
        <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600'>
          {alert.topTopics.length ? (
            alert.topTopics.map((topic) => (
              <span
                key={topic.name}
                className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1'
              >
                {topic.name} · {topic.count}
              </span>
            ))
          ) : (
            <span className='text-xs text-slate-500'>Sin temas dominantes.</span>
          )}
        </div>
      </div>

      <div className='mt-4'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Por qué disparó
          </p>
          {Number.isFinite(alert.confidence) ? (
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
              Confianza {alert.confidence?.toFixed(0)}%
            </span>
          ) : null}
        </div>
        <div className='mt-2 space-y-2'>
          {ruleRows.length ? (
            ruleRows.map((row) => (
              <div
                key={`${alert.id}-${row.id}`}
                className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
              >
                <p className='text-xs font-semibold text-slate-700'>{row.label}</p>
                <p className='text-[11px] text-slate-500'>
                  Valor {row.value ? formatRuleValue(row.value) : '—'} · Umbral {row.threshold}
                </p>
              </div>
            ))
          ) : (
            <p className='text-xs text-slate-500'>Sin reglas asociadas.</p>
          )}
        </div>
      </div>

      <div className='mt-4 space-y-3'>
        <div className='flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>
          <SparklesIcon className='h-4 w-4 text-prBlue' />
          Resumen IA
        </div>
        <ul className='text-xs text-slate-600 space-y-2'>
          <li>Señales activas en {alert.scopeLabel} con impacto sobre la conversación.</li>
          <li>Negatividad y riesgo se mantienen por encima del umbral operativo.</li>
          <li>Revisar posts evidencia y coordinar respuesta con equipo.</li>
        </ul>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => onApplyScope?.(alert)}
            className='inline-flex items-center gap-2 rounded-xl bg-prBlue px-3 py-2 text-xs font-semibold text-white shadow-glow border border-prBlue/80 hover:brightness-110'
          >
            <MapPinIcon className='h-4 w-4' />
            Aplicar filtros
          </button>
          <button
            type='button'
            onClick={() => onOpenFeedStream?.(alert)}
            className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-prBlue'
          >
            <ArrowTopRightOnSquareIcon className='h-4 w-4' />
            Ver en Feed Stream
          </button>
        </div>
      </div>

      <div className='mt-4'>
        <div className='flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>
          <BoltIcon className='h-4 w-4 text-prBlue' />
          Posts evidencia
        </div>
        <div className='mt-2 space-y-2'>
          {evidenceItems.map((post) => (
            <div
              key={post.id}
              className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
            >
              <p className='text-xs text-slate-700 line-clamp-2'>{post.content}</p>
              <div className='mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500'>
                <span
                  className={`rounded-full border px-2 py-0.5 ${sentimentTone[post.sentiment] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
                >
                  {post.sentiment}
                </span>
                <span>{post.author}</span>
                <span>· {post.platform}</span>
                <span>· {formatCompact(post.reach)} reach</span>
              </div>
            </div>
          ))}
          {!alert.evidence.length ? (
            <p className='text-xs text-slate-500'>Sin posts evidencia.</p>
          ) : null}
        </div>
        {alert.evidence.length > 4 ? (
          <button
            type='button'
            onClick={() => setExpandedEvidence((prev) => !prev)}
            className='mt-2 text-xs font-semibold text-prBlue hover:underline'
          >
            {expandedEvidence ? 'Ver menos' : 'Ver más'}
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default AlertIntel
