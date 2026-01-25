import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { useMemo, useState, type FC } from 'react'
import type { Alert, AlertSeverity, AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
  selectedAlertId?: string | null
  onSelectAlert?: (alertId: string) => void
  onAction?: (alertId: string, action: AlertStatus) => void
}

type SortKey = 'severity' | 'recency' | 'delta'

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
}

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString('es-PR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const AlertsStream: FC<Props> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onAction,
}) => {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('severity')

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

  const filtered = useMemo(() => {
    let items = alerts
    if (severityFilter !== 'all') {
      items = items.filter((alert) => alert.severity === severityFilter)
    }
    if (statusFilter !== 'all') {
      items = items.filter((alert) => alert.status === statusFilter)
    }
    return items
  }, [alerts, severityFilter, statusFilter])

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
    return base.sort(
      (a, b) =>
        severityWeight(b.severity) - severityWeight(a.severity) ||
        b.metrics.volumeDeltaPct - a.metrics.volumeDeltaPct
    )
  }, [filtered, sortBy])

  const statusOptions: Array<{ key: AlertStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'open', label: 'Abiertas' },
    { key: 'ack', label: 'Ack' },
    { key: 'snoozed', label: 'Snoozed' },
    { key: 'escalated', label: 'Escaladas' },
    { key: 'resolved', label: 'Resueltas' },
  ]

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
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className='bg-transparent text-xs font-semibold text-slate-700 focus:outline-none'
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 mb-3'>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
          <button
            key={level}
            type='button'
            onClick={() => setSeverityFilter(level)}
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
        <div className='flex items-center gap-1'>
          {statusOptions.map((option) => (
            <button
              key={option.key}
              type='button'
              onClick={() => setStatusFilter(option.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                statusFilter === option.key
                  ? 'border-prBlue bg-prBlue/10 text-prBlue'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className='space-y-3 max-h-[65vh] overflow-y-auto pr-1'>
        {sorted.map((alert) => (
          <button
            key={alert.id}
            type='button'
            onClick={() => onSelectAlert?.(alert.id)}
            className={`w-full text-left rounded-2xl border px-4 py-3 shadow-sm transition ${
              selectedAlertId === alert.id
                ? 'border-prBlue bg-prBlue/5'
                : 'border-slate-200 bg-white hover:border-prBlue/60'
            }`}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500'>
                  <span className={`rounded-full border px-2 py-0.5 ${severityTone[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 ${statusTone[alert.status]}`}>
                    {alert.status}
                  </span>
                  <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5'>
                    {alert.scopeType}
                  </span>
                </div>
                <p className='text-sm font-semibold text-ink'>{alert.title}</p>
                <p className='text-xs text-slate-500'>{alert.summary}</p>
              </div>
              <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600'>
                <FlagIcon className='h-3.5 w-3.5' />
                {alert.metrics.volumeDeltaPct.toFixed(0)}%
              </span>
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
          </button>
        ))}
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
