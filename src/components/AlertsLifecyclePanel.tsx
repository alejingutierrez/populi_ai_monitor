import { useMemo, type FC } from 'react'
import type { Alert, AlertStatus } from '../data/alerts'

interface Props {
  alerts: Alert[]
}

const statusOrder: AlertStatus[] = ['open', 'ack', 'escalated', 'snoozed', 'resolved']

const statusMeta: Record<
  AlertStatus,
  { label: string; chipTone: string; barTone: string }
> = {
  open: {
    label: 'Nueva',
    chipTone: 'border-slate-200 bg-white text-slate-600',
    barTone: 'bg-slate-400',
  },
  ack: {
    label: 'En investigación',
    chipTone: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    barTone: 'bg-indigo-500',
  },
  escalated: {
    label: 'Escalada',
    chipTone: 'border-rose-200 bg-rose-50 text-rose-700',
    barTone: 'bg-rose-500',
  },
  snoozed: {
    label: 'Pospuesta',
    chipTone: 'border-amber-200 bg-amber-50 text-amber-700',
    barTone: 'bg-amber-500',
  },
  resolved: {
    label: 'Resuelta',
    chipTone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    barTone: 'bg-emerald-500',
  },
}

const severityOrder: Alert['severity'][] = ['critical', 'high', 'medium', 'low']

const severityMeta: Record<
  Alert['severity'],
  { label: string; tone: string; accent: string }
> = {
  critical: {
    label: 'Crítica',
    tone: 'border-rose-200 bg-rose-50/80 text-rose-700',
    accent: 'bg-rose-500',
  },
  high: {
    label: 'Alta',
    tone: 'border-amber-200 bg-amber-50/80 text-amber-700',
    accent: 'bg-amber-500',
  },
  medium: {
    label: 'Media',
    tone: 'border-sky-200 bg-sky-50/80 text-sky-700',
    accent: 'bg-sky-500',
  },
  low: {
    label: 'Baja',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
    accent: 'bg-slate-500',
  },
}

const slaTargets: Record<Alert['severity'], number> = {
  critical: 2,
  high: 6,
  medium: 12,
  low: 24,
}

const isActiveStatus = (status: AlertStatus) =>
  status === 'open' || status === 'ack' || status === 'escalated'

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours)) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
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

  const totalAlerts = alerts.length
  const activeAlerts = useMemo(
    () => alerts.filter((alert) => isActiveStatus(alert.status)),
    [alerts]
  )

  const managedCount = totalAlerts - statusCounts.open
  const managedPct = totalAlerts ? (managedCount / totalAlerts) * 100 : 0
  const resolvedPct = totalAlerts ? (statusCounts.resolved / totalAlerts) * 100 : 0

  const avgAck = useMemo(() => {
    const values = alerts
      .filter((alert) => alert.ackAt && (alert.firstSeenAt || alert.createdAt))
      .map((alert) => {
        const start = new Date(alert.firstSeenAt ?? alert.createdAt).getTime()
        const end = new Date(alert.ackAt ?? alert.createdAt).getTime()
        return Math.max(0, end - start) / (1000 * 60 * 60)
      })
    return calcAvg(values)
  }, [alerts])

  const avgResolve = useMemo(() => {
    const values = alerts
      .filter((alert) => alert.resolvedAt && (alert.firstSeenAt || alert.createdAt))
      .map((alert) => {
        const start = new Date(alert.firstSeenAt ?? alert.createdAt).getTime()
        const end = new Date(alert.resolvedAt ?? alert.createdAt).getTime()
        return Math.max(0, end - start) / (1000 * 60 * 60)
      })
    return calcAvg(values)
  }, [alerts])

  const reopenedCount = useMemo(
    () => alerts.filter((alert) => (alert.occurrences ?? 1) > 1).length,
    [alerts]
  )

  const slaStats = useMemo(() => {
    const breaches = activeAlerts.filter(
      (alert) => calcAgeHours(alert) > slaTargets[alert.severity]
    )
    const atRisk = activeAlerts.filter((alert) => {
      const age = calcAgeHours(alert)
      const target = slaTargets[alert.severity]
      return age > target * 0.75 && age <= target
    })
    return {
      activeCount: activeAlerts.length,
      breachCount: breaches.length,
      breachPct: activeAlerts.length ? (breaches.length / activeAlerts.length) * 100 : 0,
      atRiskCount: atRisk.length,
    }
  }, [activeAlerts])

  const severitySlaRows = useMemo(
    () =>
      severityOrder.map((severity) => {
        const target = slaTargets[severity]
        const active = activeAlerts.filter((alert) => alert.severity === severity)
        const breaches = active.filter((alert) => calcAgeHours(alert) > target)
        const atRisk = active.filter((alert) => {
          const age = calcAgeHours(alert)
          return age > target * 0.75 && age <= target
        })
        const avgAge = calcAvg(active.map((alert) => calcAgeHours(alert)))
        return {
          severity,
          target,
          activeCount: active.length,
          breachCount: breaches.length,
          breachPct: active.length ? (breaches.length / active.length) * 100 : 0,
          atRiskCount: atRisk.length,
          avgAge,
        }
      }),
    [activeAlerts]
  )

  const topBreaches = useMemo(() => {
    return activeAlerts
      .map((alert) => {
        const age = calcAgeHours(alert)
        const target = slaTargets[alert.severity]
        return {
          id: alert.id,
          title: alert.title,
          severity: alert.severity,
          status: alert.status,
          overdueHours: age - target,
          ageHours: age,
          target,
        }
      })
      .filter((item) => item.overdueHours > 0)
      .sort((a, b) => b.overdueHours - a.overdueHours)
      .slice(0, 4)
  }, [activeAlerts])

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-3 flex-col lg:flex-row lg:items-center'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Lifecycle y SLA</p>
          <p className='text-xs text-slate-500 mt-1'>
            Métricas calculadas desde estados y timestamps de cada alerta.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold'>
          <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700'>
            Activas {slaStats.activeCount.toLocaleString('es-PR')} /{' '}
            {totalAlerts.toLocaleString('es-PR')}
          </span>
          <span
            className={`rounded-full border px-3 py-1 ${
              slaStats.breachCount
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            Brechas SLA {slaStats.breachCount.toLocaleString('es-PR')}
          </span>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-2xl border border-prBlue/20 bg-gradient-to-br from-prBlue/10 via-white to-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Backlog activo
          </p>
          <p className='text-lg font-semibold text-ink'>
            {slaStats.activeCount.toLocaleString('es-PR')}
          </p>
          <p className='text-[11px] text-slate-600'>
            {slaStats.atRiskCount.toLocaleString('es-PR')} por vencer ·{' '}
            {slaStats.breachPct.toFixed(0)}% vencidas
          </p>
        </div>
        <div className='rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Time to Ack
          </p>
          <p className='text-lg font-semibold text-ink'>
            {avgAck === null ? '—' : formatDuration(avgAck)}
          </p>
          <p className='text-[11px] text-slate-500'>Promedio sobre alertas gestionadas</p>
        </div>
        <div className='rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Time to Resolve
          </p>
          <p className='text-lg font-semibold text-ink'>
            {avgResolve === null ? '—' : formatDuration(avgResolve)}
          </p>
          <p className='text-[11px] text-slate-500'>
            {resolvedPct.toFixed(0)}% del total está resuelto
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-white px-3 py-2.5 shadow-sm'>
          <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Gestión y reaperturas
          </p>
          <p className='text-lg font-semibold text-ink'>{managedPct.toFixed(0)}%</p>
          <p className='text-[11px] text-slate-600'>
            {reopenedCount.toLocaleString('es-PR')} reincidentes
          </p>
        </div>
      </div>

      <div className='mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600'>
          <span>Distribución por estado</span>
          <span>{managedCount.toLocaleString('es-PR')} gestionadas (no nuevas)</span>
        </div>
        <div className='mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200'>
          {statusOrder.map((status) => {
            const pct = totalAlerts ? (statusCounts[status] / totalAlerts) * 100 : 0
            return (
              <div
                key={`lifecycle-bar-${status}`}
                className={statusMeta[status].barTone}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>
        <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5'>
          {statusOrder.map((status) => {
            const count = statusCounts[status]
            const pct = totalAlerts ? (count / totalAlerts) * 100 : 0
            return (
              <div
                key={`lifecycle-chip-${status}`}
                className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold ${statusMeta[status].chipTone}`}
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='truncate'>{statusMeta[status].label}</span>
                  <span>{count.toLocaleString('es-PR')}</span>
                </div>
                <p className='mt-1 text-[10px] opacity-80'>{pct.toFixed(0)}% del total</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className='mt-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]'>
        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              SLA por severidad
            </p>
            <span className='text-[10px] font-semibold text-slate-500'>
              Target: Crítica 2h · Alta 6h · Media 12h · Baja 24h
            </span>
          </div>
          <div className='mt-2 grid gap-2 sm:grid-cols-2'>
            {severitySlaRows.map((row) => (
              <div
                key={`severity-sla-${row.severity}`}
                className={`rounded-xl border px-2.5 py-2 ${severityMeta[row.severity].tone}`}
              >
                <div className='flex items-center justify-between gap-2 text-[11px] font-semibold'>
                  <span>{severityMeta[row.severity].label}</span>
                  <span>Activas {row.activeCount.toLocaleString('es-PR')}</span>
                </div>
                <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-white/80'>
                  <div
                    className={`h-full ${severityMeta[row.severity].accent}`}
                    style={{ width: `${Math.min(100, row.breachPct)}%` }}
                  />
                </div>
                <p className='mt-1 text-[10px] font-semibold'>
                  Brechas {row.breachCount.toLocaleString('es-PR')} ({row.breachPct.toFixed(0)}%) ·
                  En riesgo {row.atRiskCount.toLocaleString('es-PR')}
                </p>
                <p className='text-[10px] text-slate-600'>
                  Edad promedio {row.avgAge === null ? '—' : formatDuration(row.avgAge)} · SLA{' '}
                  {row.target}h
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm'>
          <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
            Prioridad inmediata
          </p>
          {topBreaches.length ? (
            <div className='mt-2 space-y-2'>
              {topBreaches.map((item) => (
                <div
                  key={item.id}
                  className='rounded-xl border border-rose-200 bg-rose-50/60 px-2.5 py-2'
                >
                  <p className='text-xs font-semibold text-ink truncate' title={item.title}>
                    {item.title}
                  </p>
                  <div className='mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-600'>
                    <span className={`rounded-full border px-2 py-0.5 ${severityMeta[item.severity].tone}`}>
                      {severityMeta[item.severity].label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${statusMeta[item.status].chipTone}`}>
                      {statusMeta[item.status].label}
                    </span>
                    <span className='text-rose-700'>
                      Vencida {formatDuration(item.overdueHours)} · edad{' '}
                      {formatDuration(item.ageHours)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700'>
              No hay alertas activas vencidas de SLA en el contexto actual.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default AlertsLifecyclePanel
