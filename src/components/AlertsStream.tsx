import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useMemo, useState, type FC } from 'react'
import type { Alert, AlertSeverity, AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
  selectedAlertId?: string | null
  onSelectAlert?: (alertId: string) => void
  onAction?: (alertId: string, action: AlertStatus) => void
  onBulkAction?: (alertIds: string[], action: AlertStatus) => void
}

type SortKey = 'severity' | 'recency' | 'delta' | 'risk' | 'impact' | 'sla'

const severityTone: Record<AlertSeverity, string> = {
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  medium: 'border-sky-200 bg-sky-50 text-sky-700',
  low: 'border-slate-200 bg-slate-100 text-slate-600',
}

const statusTone: Record<AlertStatus, string> = {
  open: 'border-slate-200 bg-white text-slate-600',
  ack: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  snoozed: 'border-slate-200 bg-slate-100 text-slate-600',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  escalated: 'border-rose-200 bg-rose-50 text-rose-700',
}

const severityWeight = (severity: AlertSeverity) => {
  if (severity === 'critical') return 4
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  return 1
}

const sortLabels: Record<SortKey, string> = {
  severity: 'Severidad',
  recency: 'Reciente',
  delta: 'Mayor delta',
  risk: 'Mayor riesgo',
  impact: 'Mayor impacto',
  sla: 'Mayor SLA',
}

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString('es-PR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const slaTargets: Record<AlertSeverity, number> = {
  critical: 2,
  high: 6,
  medium: 12,
  low: 24,
}

const calcAgeHours = (alert: Alert) => {
  const reference = alert.createdAt || alert.firstSeenAt || alert.lastSeenAt
  const createdAt = reference ? new Date(reference).getTime() : Date.now()
  const diff = Math.max(0, Date.now() - createdAt)
  return diff / (1000 * 60 * 60)
}

const buildSparkline = (posts: Alert['evidence'], buckets = 8) => {
  if (!posts?.length) return { volume: [], negativity: [] }
  const timestamps = posts.map((post) => new Date(post.timestamp).getTime())
  const minTs = Math.min(...timestamps)
  const maxTs = Math.max(...timestamps)
  const span = Math.max(1, maxTs - minTs)
  const bucketSize = span / buckets
  const bins = Array.from({ length: buckets }, () => ({
    total: 0,
    negative: 0,
  }))
  posts.forEach((post) => {
    const ts = new Date(post.timestamp).getTime()
    const index = Math.min(buckets - 1, Math.floor((ts - minTs) / bucketSize))
    bins[index].total += 1
    if (post.sentiment === 'negativo') bins[index].negative += 1
  })
  return {
    volume: bins.map((bin) => bin.total),
    negativity: bins.map((bin) => (bin.total ? (bin.negative / bin.total) * 100 : 0)),
  }
}

const Sparkline: FC<{ values: number[]; tone?: string }> = ({ values, tone }) => {
  if (!values.length) {
    return <div className='h-6 w-16 rounded-full bg-slate-100' />
  }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(1, max - min)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100
      const y = 30 - ((value - min) / range) * 26
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox='0 0 100 30' className='h-6 w-16'>
      <polyline
        points={points}
        fill='none'
        strokeWidth='2'
        stroke={tone ?? '#0f172a'}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

const AlertsStream: FC<Props> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onAction,
  onBulkAction,
}) => {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [statusTab, setStatusTab] = useState<AlertStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('severity')
  const [activeView, setActiveView] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const base = {
      all: alerts.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
    alerts.forEach((alert) => {
      base[alert.severity] += 1
    })
    return base
  }, [alerts])

  const statusCounts = useMemo(() => {
    const base = {
      all: alerts.length,
      open: 0,
      ack: 0,
      snoozed: 0,
      escalated: 0,
      resolved: 0,
    }
    alerts.forEach((alert) => {
      base[alert.status] += 1
    })
    return base
  }, [alerts])

  const views = [
    {
      key: 'all',
      label: 'Todas',
      severity: 'all' as const,
      status: 'all' as const,
      sort: 'severity' as SortKey,
    },
    {
      key: 'triage',
      label: 'Triage crítico',
      severity: 'critical' as const,
      status: 'open' as const,
      sort: 'severity' as SortKey,
    },
    {
      key: 'investigacion',
      label: 'Investigación',
      severity: 'all' as const,
      status: 'ack' as const,
      sort: 'recency' as SortKey,
    },
    {
      key: 'escaladas',
      label: 'Escaladas',
      severity: 'all' as const,
      status: 'escalated' as const,
      sort: 'recency' as SortKey,
    },
    {
      key: 'impacto',
      label: 'Mayor impacto',
      severity: 'all' as const,
      status: 'all' as const,
      sort: 'impact' as SortKey,
    },
  ]

  const filtered = useMemo(() => {
    let items = alerts
    if (severityFilter !== 'all') {
      items = items.filter((alert) => alert.severity === severityFilter)
    }
    if (statusTab !== 'all') {
      items = items.filter((alert) => alert.status === statusTab)
    }
    return items
  }, [alerts, severityFilter, statusTab])

  const sorted = useMemo(() => {
    const base = [...filtered]
    if (sortBy === 'recency') {
      return base.sort(
        (a, b) =>
          new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
      )
    }
    if (sortBy === 'delta') {
      return base.sort((a, b) => b.metrics.volumeDeltaPct - a.metrics.volumeDeltaPct)
    }
    if (sortBy === 'risk') {
      return base.sort((a, b) => b.metrics.riskScore - a.metrics.riskScore)
    }
    if (sortBy === 'impact') {
      return base.sort((a, b) => b.metrics.impactRatio - a.metrics.impactRatio)
    }
    if (sortBy === 'sla') {
      return base.sort((a, b) => {
        const aRatio = calcAgeHours(a) / slaTargets[a.severity]
        const bRatio = calcAgeHours(b) / slaTargets[b.severity]
        return bRatio - aRatio
      })
    }
    return base.sort(
      (a, b) =>
        severityWeight(b.severity) - severityWeight(a.severity) ||
        b.metrics.volumeDeltaPct - a.metrics.volumeDeltaPct
    )
  }, [filtered, sortBy])

  const statusOptions: Array<{ key: AlertStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'open', label: 'Abiertas' },
    { key: 'ack', label: 'Investigación' },
    { key: 'escalated', label: 'Escaladas' },
    { key: 'snoozed', label: 'Snoozed' },
    { key: 'resolved', label: 'Resueltas' },
  ]

  const applyView = (viewKey: string) => {
    const view = views.find((item) => item.key === viewKey)
    if (!view) return
    setActiveView(view.key)
    setSeverityFilter(view.severity)
    setStatusTab(view.status)
    setSortBy(view.sort)
  }

  const handleSeverityChange = (value: AlertSeverity | 'all') => {
    setActiveView('custom')
    setSeverityFilter(value)
  }

  const handleStatusChange = (value: AlertStatus | 'all') => {
    setActiveView('custom')
    setStatusTab(value)
  }

  const handleSortChange = (value: SortKey) => {
    setActiveView('custom')
    setSortBy(value)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((alert) => alert.id)))
  }

  const runBulkAction = (action: AlertStatus) => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (onBulkAction) {
      onBulkAction(ids, action)
    } else {
      ids.forEach((id) => onAction?.(id, action))
    }
    clearSelection()
  }

  useEffect(() => {
    if (!selectedIds.size) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'a') {
        event.preventDefault()
        runBulkAction('ack')
      }
      if (key === 's') {
        event.preventDefault()
        runBulkAction('snoozed')
      }
      if (key === 'r') {
        event.preventDefault()
        runBulkAction('resolved')
      }
      if (key === 'e') {
        event.preventDefault()
        runBulkAction('escalated')
      }
      if (key === 'x' || key === 'escape') {
        event.preventDefault()
        clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIds, onBulkAction, onAction])

  useEffect(() => {
    if (!selectedIds.size) return
    setSelectedIds((prev) => {
      const valid = new Set(alerts.map((alert) => alert.id))
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next
    })
  }, [alerts])

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-4 flex-col lg:flex-row lg:items-center'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Stream de alertas</p>
          <p className='text-xs text-slate-500 mt-1'>
            {sorted.length.toLocaleString('es-PR')} alertas activas
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm'>
            <span className='text-[10px] uppercase tracking-[0.14em] text-slate-400'>
              Orden
            </span>
            <select
              value={sortBy}
              onChange={(event) => handleSortChange(event.target.value as SortKey)}
              className='bg-transparent text-xs font-semibold text-slate-700 focus:outline-none'
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </select>
          </div>
          <div className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500'>
            Atajos: A Ack · S Snooze · R Resolver · E Escalar · X Limpiar
          </div>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <span className='text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
          Vistas guardadas
        </span>
        {views.map((view) => (
          <button
            key={view.key}
            type='button'
            onClick={() => applyView(view.key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              activeView === view.key
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {view.label}
          </button>
        ))}
        {activeView === 'custom' ? (
          <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700'>
            Personalizada
          </span>
        ) : null}
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        {statusOptions.map((option) => (
          <button
            key={option.key}
            type='button'
            onClick={() => handleStatusChange(option.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              statusTab === option.key
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {option.label} · {statusCounts[option.key]}
          </button>
        ))}
      </div>

      <div className='flex flex-wrap items-center gap-2 mb-3'>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
          <button
            key={level}
            type='button'
            onClick={() => handleSeverityChange(level)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              severityFilter === level
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : level === 'all'
                  ? 'border-slate-200 bg-white text-slate-600'
                  : severityTone[level as AlertSeverity]
            }`}
          >
            {level === 'all' ? 'Todas' : level} · {counts[level as keyof typeof counts]}
          </button>
        ))}
      </div>

      {selectedIds.size ? (
        <div className='mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600'>
          <span>{selectedIds.size} seleccionadas</span>
          <button
            type='button'
            onClick={() => runBulkAction('ack')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Ack
          </button>
          <button
            type='button'
            onClick={() => runBulkAction('snoozed')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Snooze
          </button>
          <button
            type='button'
            onClick={() => runBulkAction('resolved')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Resolver
          </button>
          <button
            type='button'
            onClick={selectAllFiltered}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Seleccionar todo
          </button>
          <button
            type='button'
            onClick={clearSelection}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Limpiar
          </button>
        </div>
      ) : null}

      <div className='space-y-3 max-h-[65vh] overflow-y-auto pr-1'>
        {sorted.map((alert) => {
          const ageHours = calcAgeHours(alert)
          const slaTarget = slaTargets[alert.severity]
          const slaBreach =
            ageHours > slaTarget &&
            (alert.status === 'open' || alert.status === 'ack' || alert.status === 'escalated')
          const sparkline = buildSparkline(alert.evidence)
          const isSelected = selectedIds.has(alert.id)

          return (
            <div
              key={alert.id}
              role='button'
              tabIndex={0}
              onClick={() => onSelectAlert?.(alert.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectAlert?.(alert.id)
                }
              }}
              className={`w-full text-left rounded-2xl border px-4 py-3 shadow-sm transition ${
                selectedAlertId === alert.id
                  ? 'border-prBlue bg-prBlue/5'
                  : slaBreach
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-slate-200 bg-white hover:border-prBlue/60'
              } ${isSelected ? 'ring-2 ring-prBlue/30' : ''}`}
            >
              <div className='flex items-start gap-3'>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleSelection(alert.id)
                  }}
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    isSelected
                      ? 'border-prBlue bg-prBlue text-white'
                      : 'border-slate-200 bg-white text-transparent'
                  }`}
                >
                  <CheckCircleIcon className='h-3.5 w-3.5' />
                </button>
                <div className='flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500'>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${severityTone[alert.severity]}`}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${statusTone[alert.status]}`}
                    >
                      {alert.status}
                    </span>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                      {alert.scopeType}
                    </span>
                  </div>
                  <p className='text-sm font-semibold text-ink'>{alert.title}</p>
                  <p className='text-xs text-slate-500'>{alert.summary}</p>
                </div>
                <div className='flex flex-col items-end gap-2 text-[10px] font-semibold text-slate-600'>
                  <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1'>
                    <FlagIcon className='h-3.5 w-3.5' />
                    {alert.metrics.volumeDeltaPct.toFixed(0)}%
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 ${
                      slaBreach
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    SLA {ageHours.toFixed(1)}h / {slaTarget}h
                  </span>
                </div>
              </div>
              <div className='mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-1'>
                  Negatividad {alert.metrics.negativeShare.toFixed(0)}%
                </span>
                <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-1'>
                  Riesgo {alert.metrics.riskScore.toFixed(0)} / 100
                </span>
                <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-1'>
                  Impacto {alert.metrics.impactRatio.toFixed(2)}x
                </span>
              </div>
              <div className='mt-3 flex flex-wrap items-center gap-4 text-[10px] font-semibold text-slate-500'>
                <div className='flex items-center gap-2'>
                  <span className='uppercase tracking-[0.12em] text-[9px]'>Vol</span>
                  <Sparkline values={sparkline.volume} tone='#2563eb' />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='uppercase tracking-[0.12em] text-[9px]'>Neg</span>
                  <Sparkline values={sparkline.negativity} tone='#e11d48' />
                </div>
              </div>
              <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500'>
                <span>Última detección: {formatTime(alert.lastSeenAt)}</span>
                <div className='flex flex-wrap items-center gap-1'>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      onAction?.(alert.id, 'ack')
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'
                  >
                    <CheckCircleIcon className='h-3.5 w-3.5' />
                    Ack
                  </button>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      onAction?.(alert.id, 'snoozed')
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'
                  >
                    <ClockIcon className='h-3.5 w-3.5' />
                    Snooze
                  </button>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      onAction?.(alert.id, 'escalated')
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'
                  >
                    <ArrowUpRightIcon className='h-3.5 w-3.5' />
                    Escalar
                  </button>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      onAction?.(alert.id, 'resolved')
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'
                  >
                    <CheckCircleIcon className='h-3.5 w-3.5' />
                    Resolver
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {!sorted.length ? (
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
            Sin alertas con los filtros actuales.
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default AlertsStream
