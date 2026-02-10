import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { useCallback, useEffect, useMemo, useState, type FC } from 'react'
import type { Alert, AlertSeverity, AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
  selectedAlertId?: string | null
  onSelectAlert?: (alertId: string) => void
  onAction?: (alertId: string, action: AlertStatus, options?: ActionOptions) => void
  onBulkAction?: (
    alertIds: string[],
    action: AlertStatus,
    options?: ActionOptions
  ) => void
}

type SortKey = 'severity' | 'recency' | 'delta' | 'risk' | 'impact' | 'sla'

type ActionOptions = {
  snoozeUntil?: string
}

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

const severityLabels: Record<AlertSeverity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const statusLabels: Record<AlertStatus, string> = {
  open: 'Nueva',
  ack: 'En investigación',
  snoozed: 'Pospuesta',
  resolved: 'Resuelta',
  escalated: 'Escalada',
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
  sla: 'SLA (más urgentes)',
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

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours)) return '—'
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m`
  }
  return `${hours.toFixed(1)}h`
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [snoozeHours, setSnoozeHours] = useState(2)

  const views = useMemo(
    () => [
      {
        key: 'all',
        label: 'Todas',
        hint: 'Inventario completo sin filtros.',
        severity: 'all' as const,
        status: 'all' as const,
        sort: 'severity' as SortKey,
      },
      {
        key: 'triage',
        label: 'Triage: críticas nuevas',
        hint: 'Críticas en estado Nueva, listas para priorizar.',
        severity: 'critical' as const,
        status: 'open' as const,
        sort: 'severity' as SortKey,
      },
      {
        key: 'investigacion',
        label: 'En investigación',
        hint: 'Alertas en investigación ordenadas por recencia.',
        severity: 'all' as const,
        status: 'ack' as const,
        sort: 'recency' as SortKey,
      },
      {
        key: 'escaladas',
        label: 'Escaladas',
        hint: 'Escaladas recientes para coordinación y seguimiento.',
        severity: 'all' as const,
        status: 'escalated' as const,
        sort: 'recency' as SortKey,
      },
      {
        key: 'impacto',
        label: 'Mayor impacto',
        hint: 'Ordenadas por impacto para priorizar daño potencial.',
        severity: 'all' as const,
        status: 'all' as const,
        sort: 'impact' as SortKey,
      },
    ],
    []
  )

  const validSelectedIds = useMemo(() => {
    if (!selectedIds.size) return selectedIds
    const valid = new Set(alerts.map((alert) => alert.id))
    return new Set([...selectedIds].filter((id) => valid.has(id)))
  }, [alerts, selectedIds])

  const statusCountsAll = useMemo(() => {
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

  const statusCountsFacet = useMemo(() => {
    const scoped =
      severityFilter === 'all'
        ? alerts
        : alerts.filter((alert) => alert.severity === severityFilter)

    const base = {
      all: scoped.length,
      open: 0,
      ack: 0,
      snoozed: 0,
      escalated: 0,
      resolved: 0,
    }

    scoped.forEach((alert) => {
      base[alert.status] += 1
    })

    return base
  }, [alerts, severityFilter])

  const severityCountsFacet = useMemo(() => {
    const scoped =
      statusTab === 'all' ? alerts : alerts.filter((alert) => alert.status === statusTab)

    const base = { all: scoped.length, critical: 0, high: 0, medium: 0, low: 0 }

    scoped.forEach((alert) => {
      base[alert.severity] += 1
    })

    return base
  }, [alerts, statusTab])

  const triageCount = useMemo(
    () => alerts.filter((alert) => alert.status === 'open' && alert.severity === 'critical').length,
    [alerts]
  )
  const viewCounts = useMemo(
    () => ({
      all: alerts.length,
      triage: triageCount,
      investigacion: statusCountsAll.ack,
      escaladas: statusCountsAll.escalated,
      impacto: alerts.length,
    }),
    [alerts.length, triageCount, statusCountsAll.ack, statusCountsAll.escalated]
  )

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
    { key: 'open', label: 'Nuevas' },
    { key: 'ack', label: 'En investigación' },
    { key: 'escalated', label: 'Escaladas' },
    { key: 'snoozed', label: 'Pospuestas' },
    { key: 'resolved', label: 'Resueltas' },
  ]

  const applyView = (viewKey: string) => {
    const view = views.find((item) => item.key === viewKey)
    if (!view) return
    setSeverityFilter(view.severity)
    setStatusTab(view.status)
    setSortBy(view.sort)
  }

  const handleSeverityChange = (value: AlertSeverity | 'all') => {
    setSeverityFilter(value)
  }

  const handleStatusChange = (value: AlertStatus | 'all') => {
    setStatusTab(value)
  }

  const handleSortChange = (value: SortKey) => {
    setSortBy(value)
  }

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filtered.map((alert) => alert.id)))
  }, [filtered])

  const runBulkAction = useCallback((action: AlertStatus) => {
    const ids = Array.from(validSelectedIds)
    if (!ids.length) return
    const options: ActionOptions | undefined =
      action === 'snoozed'
        ? { snoozeUntil: new Date(Date.now() + snoozeHours * 60 * 60 * 1000).toISOString() }
        : undefined
    if (onBulkAction) {
      onBulkAction(ids, action, options)
    } else {
      ids.forEach((id) => onAction?.(id, action, options))
    }
    clearSelection()
  }, [clearSelection, onAction, onBulkAction, snoozeHours, validSelectedIds])

  useEffect(() => {
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
      if (key === 'j' || key === 'k') {
        event.preventDefault()
        const ids = sorted.map((alert) => alert.id)
        const currentIndex = selectedAlertId ? ids.indexOf(selectedAlertId) : -1
        if (!ids.length) return
        const nextIndex =
          key === 'j'
            ? Math.min(ids.length - 1, Math.max(0, currentIndex + 1))
            : Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1)
        const nextId = ids[nextIndex]
        if (nextId) onSelectAlert?.(nextId)
        return
      }
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
  }, [clearSelection, runBulkAction, sorted, selectedAlertId, onSelectAlert])

  const activeViewMeta =
    views.find(
      (view) =>
        view.severity === severityFilter &&
        view.status === statusTab &&
        view.sort === sortBy
    ) ?? null

  const activeViewKey = activeViewMeta?.key ?? 'custom'

  const activeViewLabel =
    activeViewKey === 'custom' ? 'Personalizada' : activeViewMeta?.label ?? 'Todas'

  const activeAdvancedFilterCount = severityFilter === 'all' ? 0 : 1

  const severityChip =
    severityFilter === 'all'
      ? null
      : {
          label: severityLabels[severityFilter],
          count: severityCountsFacet[severityFilter],
          tone: severityTone[severityFilter],
        }

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-4 flex-col lg:flex-row lg:items-center'>
        <div className='min-w-0'>
          <p className='muted'>Alerts</p>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='h-section'>Stream de alertas</p>
            <span
              title={activeViewMeta?.hint ?? undefined}
              className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600'
            >
              Vista: {activeViewLabel}
            </span>
          </div>
          <p className='text-xs text-slate-500 mt-1'>
            Mostrando{' '}
            <span className='font-semibold text-slate-700'>
              {sorted.length.toLocaleString('es-PR')}
            </span>{' '}
            alertas{alerts.length !== sorted.length ? ` de ${alerts.length.toLocaleString('es-PR')}` : ''}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm'>
            <span className='text-[10px] uppercase tracking-[0.14em] text-slate-400'>
              Vista
            </span>
            <select
              value={activeViewKey}
              onChange={(event) => {
                const value = event.target.value
                if (value === 'custom') return
                applyView(value)
              }}
              className='bg-transparent text-xs font-semibold text-slate-700 focus:outline-none'
            >
              {views.map((view) => (
                <option key={view.key} value={view.key}>
                  {view.label} · {viewCounts[view.key as keyof typeof viewCounts].toLocaleString('es-PR')}
                </option>
              ))}
              {activeViewKey === 'custom' ? (
                <option value='custom' disabled>
                  Personalizada
                </option>
              ) : null}
            </select>
          </div>
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
          <button
            type='button'
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              filtersOpen
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Más filtros
            {activeAdvancedFilterCount ? (
              <span className='rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
                {activeAdvancedFilterCount}
              </span>
            ) : null}
          </button>
          <details className='relative'>
            <summary className='list-none cursor-pointer rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'>
              Atajos
            </summary>
            <div className='absolute right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg'>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
                Navegación
              </p>
              <p className='mt-1 text-[11px] text-slate-600'>J/K mover selección</p>
              <p className='mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
                Acciones bulk
              </p>
              <p className='mt-1 text-[11px] text-slate-600'>A reconocer · S posponer · R resolver · E escalar</p>
              <p className='mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
                Utilidad
              </p>
              <p className='mt-1 text-[11px] text-slate-600'>X/Esc limpiar selección</p>
            </div>
          </details>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <div className='flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1'>
          {statusOptions.map((option) => (
            <button
              key={option.key}
              type='button'
              onClick={() => handleStatusChange(option.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                statusTab === option.key
                  ? 'bg-prBlue text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              title={option.key === 'all' ? 'Todas las alertas' : `Estado: ${option.label}`}
            >
              {option.label}{' '}
              <span className='opacity-80'>
                · {statusCountsFacet[option.key].toLocaleString('es-PR')}
              </span>
            </button>
          ))}
        </div>
        <button
          type='button'
          onClick={() => applyView('triage')}
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${
            activeViewKey === 'triage'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/50'
          }`}
          title='Críticas en estado Nueva'
        >
          Triage · {triageCount.toLocaleString('es-PR')}
        </button>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
        <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1'>
          Orden: {sortLabels[sortBy]}
        </span>
        {severityChip ? (
          <button
            type='button'
            onClick={() => handleSeverityChange('all')}
            className={`rounded-full border px-2.5 py-1 ${severityChip.tone}`}
            title='Quitar filtro de severidad'
          >
            Severidad: {severityChip.label} · {severityChip.count.toLocaleString('es-PR')}{' '}
            <span className='ml-1 opacity-70'>×</span>
          </button>
        ) : null}
        {activeViewKey !== 'all' ? (
          <button
            type='button'
            onClick={() => applyView('all')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-prBlue'
            title='Volver al inventario completo'
          >
            Restablecer
          </button>
        ) : null}
      </div>

      {filtersOpen ? (
        <div className='mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[10px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
              Vistas y severidad
            </p>
            <button
              type='button'
              onClick={() => applyView('all')}
              className='rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-prBlue'
            >
              Restablecer
            </button>
          </div>

          <div className='grid gap-3 lg:grid-cols-2'>
            <div>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Vistas
              </p>
              <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                {views.map((view) => (
                  <button
                    key={view.key}
                    type='button'
                    onClick={() => applyView(view.key)}
                    className={`rounded-2xl border p-3 text-left text-[11px] font-semibold transition ${
                      activeViewKey === view.key
                        ? 'border-prBlue bg-white shadow-sm'
                        : 'border-slate-200 bg-white hover:border-prBlue/60'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <span className='text-slate-700'>{view.label}</span>
                      <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600'>
                        {viewCounts[view.key as keyof typeof viewCounts].toLocaleString('es-PR')}
                      </span>
                    </div>
                    <p className='mt-1 text-[11px] font-medium text-slate-500'>
                      {view.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
                Severidad
              </p>
              <div className='mt-2 flex flex-wrap items-center gap-2'>
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
                    {level === 'all' ? 'Todas' : severityLabels[level]} ·{' '}
                    {severityCountsFacet[level as keyof typeof severityCountsFacet].toLocaleString('es-PR')}
                  </button>
                ))}
              </div>
              <p className='mt-2 text-[11px] font-medium text-slate-500'>
                Tip: usa las pestañas de <span className='font-semibold'>Estado</span> (arriba) para navegar el flujo sin abrir este panel.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {validSelectedIds.size ? (
        <div className='mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600'>
          <span>{validSelectedIds.size} seleccionadas</span>
          <button
            type='button'
            onClick={() => runBulkAction('ack')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Reconocer
          </button>
          <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1'>
            <span className='text-[10px] uppercase tracking-[0.14em] text-slate-400'>
              Posponer
            </span>
            <select
              value={snoozeHours}
              onChange={(event) => setSnoozeHours(Number(event.target.value))}
              className='bg-transparent text-[11px] font-semibold text-slate-600 focus:outline-none'
            >
              {[2, 4, 6, 12, 24].map((hours) => (
                <option key={hours} value={hours}>
                  {hours}h
                </option>
              ))}
            </select>
          </div>
          <button
            type='button'
            onClick={() => runBulkAction('snoozed')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Posponer
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
            onClick={() => runBulkAction('escalated')}
            className='rounded-full border border-slate-200 bg-white px-2.5 py-1 hover:border-prBlue'
          >
            Escalar
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
          const remainingHours = slaTarget - ageHours
          const slaLabel =
            remainingHours >= 0
              ? `SLA restante ${formatDuration(remainingHours)}`
              : `Vencida hace ${formatDuration(Math.abs(remainingHours))}`
          const slaBreach =
            ageHours > slaTarget &&
            (alert.status === 'open' || alert.status === 'ack' || alert.status === 'escalated')
          const sparkline = buildSparkline(alert.evidence)
          const isSelected = validSelectedIds.has(alert.id)

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
              className={`group w-full text-left rounded-2xl border px-4 py-3 shadow-sm transition ${
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
                <div className='flex-1 space-y-2'>
                  <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${severityTone[alert.severity]}`}
                    >
                      {severityLabels[alert.severity]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${statusTone[alert.status]}`}
                    >
                      {statusLabels[alert.status]}
                    </span>
                    <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                      {alert.scopeType}
                    </span>
                  </div>
                  <p className='text-sm font-semibold text-ink'>{alert.title}</p>
                  <p className='text-xs text-slate-500'>{alert.summary}</p>
                  <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
                    {alert.signals.slice(0, 2).map((signal) => (
                      <span
                        key={`${alert.id}-signal-${signal.type}`}
                        className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'
                      >
                        {signal.label}
                      </span>
                    ))}
                    <span className='text-[11px] text-slate-500'>
                      Contexto: {alert.topTopics[0]?.name ?? 'Sin tema'} · {alert.scopeLabel}
                    </span>
                  </div>
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
                    {slaLabel}
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
                <span className='text-[10px] text-slate-400'>
                  Azul: volumen · Rojo: negatividad
                </span>
              </div>
              <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500'>
                <span>
                  Última detección: {formatTime(alert.lastSeenAt)} · Edad{' '}
                  {formatDuration(ageHours)}
                </span>
                <div
                  className={`flex flex-wrap items-center gap-1 transition ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <button
                    type='button'
                    onClick={(event) => {
                      event.stopPropagation()
                      onAction?.(alert.id, 'ack')
                    }}
                    className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'
                  >
                    <CheckCircleIcon className='h-3.5 w-3.5' />
                    Investigar
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
                  <details className='relative'>
                    <summary className='list-none cursor-pointer rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-prBlue'>
                      Más
                    </summary>
                    <div className='absolute right-0 z-10 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-2 shadow-lg'>
                      <button
                        type='button'
                        onClick={(event) => {
                          event.stopPropagation()
                          onAction?.(alert.id, 'snoozed')
                        }}
                        className='flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50'
                      >
                        <ClockIcon className='h-3.5 w-3.5' />
                        Posponer
                      </button>
                      <button
                        type='button'
                        onClick={(event) => {
                          event.stopPropagation()
                          onAction?.(alert.id, 'escalated')
                        }}
                        className='flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50'
                      >
                        <ArrowUpRightIcon className='h-3.5 w-3.5' />
                        Escalar
                      </button>
                    </div>
                  </details>
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
