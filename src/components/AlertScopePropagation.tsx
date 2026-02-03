import { useMemo, type FC } from 'react'
import type { Alert } from '../data/alerts'

interface Props {
  alerts: Alert[]
}

const scopeLabels: Record<Alert['scopeType'], string> = {
  overall: 'Panorama',
  cluster: 'Cluster',
  subcluster: 'Subcluster',
  microcluster: 'Microcluster',
  city: 'Ciudad',
  platform: 'Plataforma',
}

const severityWeight: Record<Alert['severity'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const severityLabel: Record<Alert['severity'], string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const AlertScopePropagation: FC<Props> = ({ alerts }) => {
  const scopeStats = useMemo(() => {
    const base = Object.keys(scopeLabels).map((key) => ({
      key: key as Alert['scopeType'],
      label: scopeLabels[key as Alert['scopeType']],
      count: 0,
    }))
    alerts.forEach((alert) => {
      const entry = base.find((item) => item.key === alert.scopeType)
      if (entry) entry.count += 1
    })
    return base
  }, [alerts])

  const hotspots = useMemo(() => {
    return [...alerts]
      .map((alert) => ({
        id: alert.id,
        label: alert.scopeLabel,
        scope: scopeLabels[alert.scopeType],
        severity: alert.severity,
        score:
          severityWeight[alert.severity] *
          (Number.isFinite(alert.metrics.impactRatio) ? alert.metrics.impactRatio : 1) *
          (Number.isFinite(alert.metrics.riskScore) ? alert.metrics.riskScore : 1),
        delta: alert.metrics.volumeDeltaPct,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [alerts])

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-3 flex-col'>
        <div>
          <p className='muted'>Alerts</p>
          <p className='h-section'>Propagación por scope</p>
          <p className='text-xs text-slate-500 mt-1'>
            Distribución de alertas por nivel y hotspots dominantes.
          </p>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
        {scopeStats.map((item) => (
          <div
            key={item.key}
            className='rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm'
          >
            <p className='text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
              {item.label}
            </p>
            <p className='text-lg font-semibold text-ink'>{item.count}</p>
            <p className='text-[11px] text-slate-500'>Alertas activas</p>
          </div>
        ))}
      </div>

      <div className='mt-4'>
        <p className='text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold'>
          Hotspots
        </p>
        <div className='mt-2 space-y-2'>
          {hotspots.length ? (
            hotspots.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 flex items-center justify-between'
              >
                <div>
                  <p className='font-semibold text-slate-700'>{item.label}</p>
                  <p className='text-[11px] text-slate-500'>
                    {item.scope} · Δ {item.delta.toFixed(0)}%
                  </p>
                </div>
                <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600'>
                  {severityLabel[item.severity]}
                </span>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500'>
              Sin hotspots en este rango.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default AlertScopePropagation
