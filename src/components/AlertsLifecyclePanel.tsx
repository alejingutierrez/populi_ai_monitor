import { useMemo, type FC } from 'react'
import type { Alert, AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
}

const slaTargets: Record<Alert['severity'], number> = {
  critical: 2,
  high: 6,
  medium: 12,
  low: 24,
}

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours)) return '—'
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))}m`
  }
  return `${hours.toFixed(1)}h`
}

const calcAgeHours = (alert: Alert) => {
  const reference = alert.firstSeenAt || alert.createdAt || alert.lastSeenAt
  const createdAt = reference ? new Date(reference).getTime() : Date.now()
  const diff = Math.max(0, Date.now() - createdAt)
  return diff / (1000 * 60 * 60)
}

const calcAvg = (values: number[]) => {
  if (!values.length) return null
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

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
  snoozed: 'border-slate-200 bg-slate-100 text-slate-600',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  escalated: 'border-rose-200 bg-rose-50 text-rose-700',
}

const AlertsLifecyclePanel: FC<Props> = ({ alerts }) => {
  const statusCounts = useMemo(() => {
    const base: Record<AlertStatus, number> = {
      open: 0,
      ack: 0,
      snoozed: 0,
      resolved: 0,
      escalated: 0,
    }
    alerts.forEach((alert) => {
      base[alert.status] += 1
    })
    return base
  }, [alerts])

  const avgAck = useMemo(() => {
    const values = alerts
      .filter((alert) => alert.ackAt && alert.firstSeenAt)
      .map((alert) => {
        const start = new Date(alert.firstSeenAt ?? alert.createdAt).getTime()
        const end = new Date(alert.ackAt ?? alert.createdAt).getTime()
        return Math.max(0, end - start) / (1000 * 60 * 60)
      })
    return calcAvg(values)
  }, [alerts])

  const avgResolve = useMemo(() => {
    const values = alerts
      .filter((alert) => alert.resolvedAt && alert.firstSeenAt)
      .map((alert) => {
        const start = new Date(alert.firstSeenAt ?? alert.createdAt).getTime()
        const end = new Date(alert.resolvedAt ?? alert.createdAt).getTime()
        return Math.max(0, end - start) / (1000 * 60 * 60)
      })
    return calcAvg(values)
  }, [alerts])

  const slaStats = useMemo(() => {
    const active = alerts.filter((alert) =>
      ['open', 'ack', 'escalated'].includes(alert.status)
    )
    const breaches = active.filter((alert) => calcAgeHours(alert) > slaTargets[alert.severity])
    const breachPct = active.length ? (breaches.length / active.length) * 100 : 0
    return {
      activeCount: active.length,
      breachCount: breaches.length,
      breachPct,
    }
  }, [alerts])

  const reopenedCount = useMemo(
    () => alerts.filter((alert) => (alert.occurrences ?? 1) > 1).length,
    [alerts]
  )

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-3 flex-col'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Lifecycle y SLA</p>
          <p className='text-xs text-slate-500 mt-1'>
            Estado operativo, tiempos de respuesta y brechas.
          </p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          Activas {slaStats.activeCount}
        </span>
      </div>

      <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
        {(Object.keys(statusLabels) as AlertStatus[]).map((status) => (
          <span
            key={status}
            className={`rounded-full border px-2.5 py-1 ${statusTone[status]}`}
          >
            {statusLabels[status]} · {statusCounts[status]}
          </span>
        ))}
      </div>

      <div className='mt-4 grid gap-3 sm:grid-cols-3'>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Time to Ack
          </p>
          <p className='text-lg font-semibold text-ink'>
            {avgAck === null ? '—' : formatDuration(avgAck)}
          </p>
          <p className='text-[11px] text-slate-500'>Promedio histórico</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Time to Resolve
          </p>
          <p className='text-lg font-semibold text-ink'>
            {avgResolve === null ? '—' : formatDuration(avgResolve)}
          </p>
          <p className='text-[11px] text-slate-500'>Promedio histórico</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Reaperturas
          </p>
          <p className='text-lg font-semibold text-ink'>{reopenedCount}</p>
          <p className='text-[11px] text-slate-500'>Alertas reincidentes</p>
        </div>
      </div>

      <div className='mt-4'>
        <div className='flex items-center justify-between text-[11px] font-semibold text-slate-600'>
          <span>Brecha de SLA</span>
          <span>
            {slaStats.breachCount}/{slaStats.activeCount} ·{' '}
            {slaStats.breachPct.toFixed(0)}%
          </span>
        </div>
        <div className='mt-2 h-2 rounded-full bg-slate-100 overflow-hidden'>
          <div
            className='h-full rounded-full bg-rose-500'
            style={{ width: `${Math.min(100, slaStats.breachPct)}%` }}
          />
        </div>
      </div>
    </section>
  )
}

export default AlertsLifecyclePanel
