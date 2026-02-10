import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState, type FC } from 'react'
import {
  defaultAlertThresholds,
  formatRange,
  type Alert,
  type AlertAction,
  type AlertHistoryPoint,
  type AlertRuleValue,
  type AlertSignalType,
} from '../data/alerts'

interface Props {
  alert?: Alert | null
  history?: AlertHistoryPoint[]
  relatedAlerts?: Alert[]
  actions?: AlertAction[]
  isLoading?: boolean
  onSelectAlert?: (alertId: string) => void
  onApplyScope?: (alert: Alert) => void
  onOpenFeedStream?: (alert: Alert) => void
  onRequestInsight?: (alert: Alert) => void
}

const compactFormatter = new Intl.NumberFormat('es-PR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatCompact = (value: number) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '0'

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString('es-PR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const buildDeltaBadge = (current: number, prev: number, prefersLower = false) => {
  const delta = pctChange(current, prev)
  const label =
    prev === 0 && current > 0 ? 'Nuevo' : `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`
  const isGood = prefersLower ? delta <= 0 : delta >= 0
  return {
    label,
    tone: isGood
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700',
  }
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

const statusLabels: Record<Alert['status'], string> = {
  open: 'Nueva',
  ack: 'En investigación',
  snoozed: 'Pospuesta',
  resolved: 'Resuelta',
  escalated: 'Escalada',
}

const statusTone: Record<Alert['status'], string> = {
  open: 'border-slate-200 bg-white text-slate-600',
  ack: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  snoozed: 'border-slate-200 bg-slate-100 text-slate-600',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  escalated: 'border-rose-200 bg-rose-50 text-rose-700',
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
    return `Δ ${rule.deltaPct.toFixed(1)}%`
  }
  if (typeof rule.zScore === 'number' && Number.isFinite(rule.zScore)) {
    return `z ${rule.zScore.toFixed(1)}`
  }
  if (typeof rule.value === 'number' && Number.isFinite(rule.value)) {
    return rule.value.toFixed(1)
  }
  return '—'
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string, terms: string[]) => {
  if (!terms.length) return text
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  const normalized = new Set(terms.map((term) => term.toLowerCase()))
  return parts.map((part, index) =>
    normalized.has(part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className='rounded bg-amber-100 px-1 text-slate-700'
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

const AlertIntel: FC<Props> = ({
  alert,
  history,
  relatedAlerts,
  actions,
  isLoading = false,
  onSelectAlert,
  onApplyScope,
  onOpenFeedStream,
  onRequestInsight,
}) => {
  const [expandedEvidence, setExpandedEvidence] = useState(false)
  const [activeTab, setActiveTab] = useState<
    | 'resumen'
    | 'evidencia'
    | 'historia'
    | 'actividad'
    | 'explicacion'
    | 'distribucion'
    | 'reglas'
    | 'relacionadas'
  >('resumen')
  const [feedback, setFeedback] = useState<'none' | 'falseAlarm' | 'confirmed'>('none')
  const [pinnedEvidence, setPinnedEvidence] = useState<Set<string>>(new Set())
  const ruleRows = useMemo(() => {
    if (!alert) return []
    const rows = alert.ruleValues
      ? Object.entries(alert.ruleValues).map(([key, value]) => {
          const typedKey = key as AlertSignalType
          const catalog = ruleCatalog[typedKey]
          const score =
            typeof value.deltaPct === 'number'
              ? Math.abs(value.deltaPct)
              : typeof value.zScore === 'number'
                ? Math.abs(value.zScore)
                : typeof value.value === 'number'
                  ? value.value
                  : 0
          return {
            id: key,
            label: catalog?.label ?? key,
            threshold: catalog?.threshold ?? '—',
            value,
            score,
          }
        })
      : (alert.ruleIds ?? []).map((key) => {
          const catalog = ruleCatalog[key]
          return {
            id: key,
            label: catalog?.label ?? key,
            threshold: catalog?.threshold ?? '—',
            value: null,
            score: 0,
          }
        })
    return rows.sort((a, b) => b.score - a.score)
  }, [alert])

  const evidenceItems = useMemo(() => {
    if (!alert) return []
    return expandedEvidence ? alert.evidence.slice(0, 10) : alert.evidence.slice(0, 4)
  }, [alert, expandedEvidence])

  const keywordTerms = useMemo(
    () => (alert?.keywords ?? []).map((item) => item.term).filter(Boolean),
    [alert]
  )

  const historyPoints = useMemo(() => {
    if (!history?.length) return []
    return [...history].sort(
      (a, b) => new Date(a.windowEnd).getTime() - new Date(b.windowEnd).getTime()
    )
  }, [history])

  const prevPoint = historyPoints.length >= 2 ? historyPoints[historyPoints.length - 2] : null
  const currentPoint = historyPoints.length ? historyPoints[historyPoints.length - 1] : null

  const formatWindow = (point: AlertHistoryPoint) =>
    formatRange(new Date(point.windowStart), new Date(point.windowEnd))

  const actionRows = useMemo(() => actions ?? [], [actions])
  const relatedRows = useMemo(() => relatedAlerts ?? [], [relatedAlerts])

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
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${severityTone[alert.severity]}`}
          >
            {severityLabels[alert.severity]}
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

      <div className='mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
        {[
          { key: 'resumen', label: 'Resumen' },
          { key: 'evidencia', label: `Evidencia (${alert.evidence.length})` },
          { key: 'historia', label: `Historia (${historyPoints.length})` },
          { key: 'actividad', label: `Actividad (${actionRows.length})` },
          { key: 'explicacion', label: 'Explicación' },
          { key: 'distribucion', label: 'Distribución' },
          { key: 'reglas', label: 'Reglas' },
          { key: 'relacionadas', label: `Relacionadas (${relatedRows.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type='button'
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`rounded-full border px-2.5 py-1 ${
              activeTab === tab.key
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumen' ? (
        <div className='mt-4 space-y-4'>
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

          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>
              <SparklesIcon className='h-4 w-4 text-prBlue' />
              Resumen IA
            </div>
            <ul className='text-xs text-slate-600 space-y-2'>
              <li>Validar señal principal y revisar evidencia crítica.</li>
              <li>Confirmar tema dominante y responsables internos.</li>
              <li>Definir si escala o se resuelve con respuesta puntual.</li>
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
              <button
                type='button'
                onClick={() => onRequestInsight?.(alert)}
                className='inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300'
              >
                <SparklesIcon className='h-4 w-4' />
                Pedir insight de esta alerta
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'historia' ? (
        <div className='mt-4 space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Historia por ventana
            </p>
            {currentPoint ? (
              <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
                {formatWindow(currentPoint)}
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Cargando historia…
            </div>
          ) : !currentPoint ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Sin historia disponible para esta alerta en el rango actual.
            </div>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2'>
              {prevPoint ? (
                <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
                  <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                    Ventana previa
                  </p>
                  <p className='text-[11px] text-slate-500 mt-1'>{formatWindow(prevPoint)}</p>
                  <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                    <span className={`rounded-full border px-2 py-0.5 ${severityTone[prevPoint.severity]}`}>
                      {severityLabels[prevPoint.severity]}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusTone[prevPoint.status]}`}>
                      {statusLabels[prevPoint.status]}
                    </span>
                  </div>
                  <div className='mt-3 grid gap-2'>
                    <div className='flex items-center justify-between text-xs text-slate-600'>
                      <span>Volumen</span>
                      <span className='font-semibold text-slate-700'>
                        {formatCompact(prevPoint.metrics.volumeCurrent)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-xs text-slate-600'>
                      <span>Negatividad</span>
                      <span className='font-semibold text-slate-700'>
                        {prevPoint.metrics.negativeShare.toFixed(0)}%
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-xs text-slate-600'>
                      <span>Riesgo</span>
                      <span className='font-semibold text-slate-700'>
                        {prevPoint.metrics.riskScore.toFixed(0)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-xs text-slate-600'>
                      <span>Impacto</span>
                      <span className='font-semibold text-slate-700'>
                        {prevPoint.metrics.impactRatio.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600'>
                  Sin ventana previa disponible con los filtros actuales.
                </div>
              )}

              <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
                <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                  Ventana actual
                </p>
                <p className='text-[11px] text-slate-500 mt-1'>{formatWindow(currentPoint)}</p>
                <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                  <span className={`rounded-full border px-2 py-0.5 ${severityTone[currentPoint.severity]}`}>
                    {severityLabels[currentPoint.severity]}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 ${statusTone[currentPoint.status]}`}>
                    {statusLabels[currentPoint.status]}
                  </span>
                </div>
                <div className='mt-3 grid gap-2'>
                  <div className='flex items-center justify-between text-xs text-slate-600'>
                    <span>Volumen</span>
                    <span className='font-semibold text-slate-700'>
                      {formatCompact(currentPoint.metrics.volumeCurrent)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-xs text-slate-600'>
                    <span>Negatividad</span>
                    <span className='font-semibold text-slate-700'>
                      {currentPoint.metrics.negativeShare.toFixed(0)}%
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-xs text-slate-600'>
                    <span>Riesgo</span>
                    <span className='font-semibold text-slate-700'>
                      {currentPoint.metrics.riskScore.toFixed(0)}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-xs text-slate-600'>
                    <span>Impacto</span>
                    <span className='font-semibold text-slate-700'>
                      {currentPoint.metrics.impactRatio.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {prevPoint && currentPoint && !isLoading ? (
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600'>
              <span className='text-[10px] uppercase tracking-[0.14em] text-slate-400'>
                Cambios
              </span>
              {(() => {
                const volumeBadge = buildDeltaBadge(
                  currentPoint.metrics.volumeCurrent,
                  prevPoint.metrics.volumeCurrent
                )
                const negBadge = buildDeltaBadge(
                  currentPoint.metrics.negativeShare,
                  prevPoint.metrics.negativeShare,
                  true
                )
                const riskBadge = buildDeltaBadge(
                  currentPoint.metrics.riskScore,
                  prevPoint.metrics.riskScore,
                  true
                )
                const impactBadge = buildDeltaBadge(
                  currentPoint.metrics.impactRatio,
                  prevPoint.metrics.impactRatio
                )
                return (
                  <>
                    <span className={`rounded-full border px-2 py-0.5 ${volumeBadge.tone}`}>
                      Vol {volumeBadge.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${negBadge.tone}`}>
                      Neg {negBadge.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${riskBadge.tone}`}>
                      Riesgo {riskBadge.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${impactBadge.tone}`}>
                      Impacto {impactBadge.label}
                    </span>
                  </>
                )
              })()}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'actividad' ? (
        <div className='mt-4 space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Actividad y auditoría
            </p>
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
              {actionRows.length} eventos
            </span>
          </div>

          {isLoading ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Cargando actividad…
            </div>
          ) : actionRows.length ? (
            <div className='space-y-2'>
              {actionRows.map((item) => {
                const tone =
                  (statusTone as Partial<Record<string, string>>)[item.action] ??
                  'border-slate-200 bg-slate-50 text-slate-600'
                const label =
                  (statusLabels as Partial<Record<string, string>>)[item.action] ??
                  item.action
                return (
                  <div
                    key={item.id}
                    className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600'>
                      <span className={`rounded-full border px-2 py-0.5 ${tone}`}>
                        {label}
                      </span>
                      <span className='text-[10px] text-slate-400'>
                        {item.createdAt ? formatTime(item.createdAt) : '—'}
                      </span>
                    </div>
                    <p className='mt-1 text-xs text-slate-700'>
                      <span className='text-slate-500'>Actor:</span>{' '}
                      {item.actor ? item.actor : '—'}
                    </p>
                    {item.note ? (
                      <p className='mt-1 text-xs text-slate-600'>{item.note}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Sin actividad registrada para esta alerta.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'explicacion' ? (
        <div className='mt-4 space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Por qué disparó
            </p>
            {Number.isFinite(alert.confidence) ? (
              <span
                className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'
                title='Confianza basada en volumen, consistencia de señales y estabilidad vs periodo previo.'
              >
                Confianza {alert.confidence?.toFixed(0)}%
              </span>
            ) : null}
          </div>
          <div className='space-y-2'>
            {ruleRows.length ? (
              ruleRows.map((row) => (
                <div
                  key={`${alert.id}-${row.id}`}
                  className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
                >
                  <p className='text-xs font-semibold text-slate-700'>{row.label}</p>
                  <p className='text-[11px] text-slate-500'>
                    Valor {row.value ? formatRuleValue(row.value) : '—'} · Umbral{' '}
                    {row.threshold}
                  </p>
                </div>
              ))
            ) : (
              <p className='text-xs text-slate-500'>Sin reglas asociadas.</p>
            )}
          </div>
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
            Confianza basada en volumen, consistencia multi-plataforma y estabilidad.
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => setFeedback('falseAlarm')}
              className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-prBlue'
            >
              Marcar como falsa alarma
            </button>
            {feedback === 'falseAlarm' ? (
              <span className='text-xs text-emerald-600'>Feedback enviado.</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === 'evidencia' ? (
        <div className='mt-4'>
          <div className='flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]'>
            <BoltIcon className='h-4 w-4 text-prBlue' />
            Posts evidencia
          </div>
          <div className='mt-2 space-y-2'>
            {evidenceItems.map((post) => {
              const isPinned = pinnedEvidence.has(post.id)
              return (
                <div
                  key={post.id}
                  className={`rounded-2xl border px-3 py-2 shadow-sm ${
                    isPinned
                      ? 'border-amber-200 bg-amber-50/60'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <p className='text-xs text-slate-700 line-clamp-3'>
                    {highlightText(post.content, keywordTerms)}
                  </p>
                  <div className='mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500'>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${sentimentTone[post.sentiment] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
                    >
                      {post.sentiment}
                    </span>
                    <span>{post.author}</span>
                    <span>· {post.platform}</span>
                    <span>· {new Date(post.timestamp).toLocaleString('es-PR')}</span>
                    {post.domain ? <span>· {post.domain}</span> : null}
                    {post.language ? <span>· {post.language}</span> : null}
                    <span>· {formatCompact(post.reach)} reach</span>
                    <span>· {formatCompact(post.engagement)} engagement</span>
                  </div>
                  <div className='mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600'>
                    <button
                      type='button'
                      onClick={() => onOpenFeedStream?.(alert)}
                      className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
                    >
                      Abrir
                    </button>
                    {post.url ? (
                      <a
                        href={post.url}
                        target='_blank'
                        rel='noreferrer'
                        className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
                      >
                        Fuente
                      </a>
                    ) : null}
                    <button
                      type='button'
                      onClick={() => navigator.clipboard?.writeText(post.content)}
                      className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
                    >
                      Copiar
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setPinnedEvidence((prev) => {
                          const next = new Set(prev)
                          if (next.has(post.id)) {
                            next.delete(post.id)
                          } else {
                            next.add(post.id)
                          }
                          return next
                        })
                      }
                      className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
                    >
                      {isPinned ? 'Quitar clave' : 'Marcar clave'}
                    </button>
                  </div>
                </div>
              )
            })}
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
      ) : null}

      {activeTab === 'distribucion' ? (
        <div className='mt-4 space-y-3'>
          <div>
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
          <div>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Entidades clave
            </p>
            <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600'>
              {alert.topEntities?.length ? (
                alert.topEntities.map((entity) => (
                  <span
                    key={entity.name}
                    className='rounded-full border border-slate-200 bg-white px-2.5 py-1'
                  >
                    {entity.name} · {entity.count}
                  </span>
                ))
              ) : (
                <span className='text-xs text-slate-500'>Sin entidades.</span>
              )}
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Autores únicos
              </p>
              <p className='text-lg font-semibold text-ink'>
                {alert.uniqueAuthors ?? 0}
              </p>
              <p className='text-[11px] text-slate-500'>
                Nuevos {alert.newAuthorsPct?.toFixed(0) ?? 0}%
              </p>
            </div>
            <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
              <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Cobertura geo
              </p>
              <p className='text-lg font-semibold text-ink'>{alert.geoSpread ?? 0}</p>
              <p className='text-[11px] text-slate-500'>Municipios impactados</p>
            </div>
          </div>
          <div>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Keywords
            </p>
            <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600'>
              {alert.keywords?.length ? (
                alert.keywords.map((keyword) => (
                  <span
                    key={keyword.term}
                    className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1'
                  >
                    {keyword.term} · {keyword.count}
                  </span>
                ))
              ) : (
                <span className='text-xs text-slate-500'>Sin keywords.</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'reglas' ? (
        <div className='mt-4 space-y-2'>
          {ruleRows.length ? (
            ruleRows.map((row) => (
              <div
                key={`${alert.id}-${row.id}`}
                className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
              >
                <div className='flex items-center justify-between text-xs text-slate-600'>
                  <span className='font-semibold text-slate-700'>{row.label}</span>
                  <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
                    {row.value ? formatRuleValue(row.value) : '—'}
                  </span>
                </div>
                <p className='mt-1 text-[11px] text-slate-500'>Umbral: {row.threshold}</p>
                {row.value?.minVolume ? (
                  <p className='text-[11px] text-slate-500'>
                    Min volumen: {row.value.minVolume}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className='text-xs text-slate-500'>Sin reglas asociadas.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'relacionadas' ? (
        <div className='mt-4 space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              Alertas relacionadas
            </p>
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
              {relatedRows.length} alertas
            </span>
          </div>

          {isLoading ? (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              Cargando relacionadas…
            </div>
          ) : relatedRows.length ? (
            <div className='space-y-2'>
              {relatedRows.map((item) => (
                <div
                  key={item.id}
                  className='rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                        <span className={`rounded-full border px-2 py-0.5 ${severityTone[item.severity]}`}>
                          {severityLabels[item.severity]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 ${statusTone[item.status]}`}>
                          {statusLabels[item.status]}
                        </span>
                        <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                          {item.scopeType}
                        </span>
                      </div>
                      <p className='mt-1 text-sm font-semibold text-ink line-clamp-2'>
                        {item.title}
                      </p>
                      <p className='text-xs text-slate-500'>{item.scopeLabel}</p>
                    </div>
                    {onSelectAlert ? (
                      <button
                        type='button'
                        onClick={() => onSelectAlert(item.id)}
                        className='flex-none rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-prBlue'
                      >
                        Abrir
                      </button>
                    ) : null}
                  </div>

                  <div className='mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                      Δ {item.metrics.volumeDeltaPct.toFixed(0)}%
                    </span>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                      Neg {item.metrics.negativeShare.toFixed(0)}%
                    </span>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                      Riesgo {item.metrics.riskScore.toFixed(0)}
                    </span>
                    <span className='text-[11px] text-slate-400'>
                      Última detección {formatTime(item.lastSeenAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
              No hay alertas relacionadas en este rango.
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default AlertIntel
