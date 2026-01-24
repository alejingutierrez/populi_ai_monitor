import type { FC } from 'react'
import type { NetworkEdge } from '../data/networkConnections'

interface Props {
  edges: NetworkEdge[]
  onSelectEdge?: (edgeId: string | null) => void
  selectedEdgeId?: string | null
}

const fullFormatter = new Intl.NumberFormat('es-PR')

const ConnectionMatrix: FC<Props> = ({ edges, onSelectEdge, selectedEdgeId }) => {
  const rows = edges.slice(0, 12)

  return (
    <section className='card p-4'>
      <div className='card-header items-start gap-4 flex-col md:flex-row md:items-center'>
        <div>
          <p className='muted'>Network Connections</p>
          <p className='h-section'>Connection matrix</p>
        </div>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600'>
          Top enlaces
        </span>
      </div>
      <div className='grid gap-2'>
        <div className='hidden sm:grid grid-cols-[minmax(0,1.4fr)_0.8fr_0.6fr_0.6fr] text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] px-3'>
          <span>Enlace</span>
          <span className='text-right'>Co-ocurrencia</span>
          <span className='text-right'>Δ</span>
          <span className='text-right'>Riesgo</span>
        </div>
        {rows.map((edge) => {
          const active = edge.id === selectedEdgeId
          return (
            <button
              key={edge.id}
              type='button'
              onClick={() => onSelectEdge?.(edge.id)}
              className={`grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_0.8fr_0.6fr_0.6fr] items-center rounded-2xl border px-3 py-2 text-left text-xs transition ${
                active
                  ? 'border-prBlue bg-prBlue/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className='min-w-0'>
                <div className='flex items-center justify-between gap-2 sm:block'>
                  <span className='font-semibold text-slate-700 truncate'>
                    {edge.source} → {edge.target}
                  </span>
                  <span className='text-[11px] text-slate-500 sm:hidden'>
                    {fullFormatter.format(edge.weight)} · {edge.deltaPct >= 0 ? '+' : ''}
                    {edge.deltaPct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className='hidden sm:block text-right text-slate-600'>
                {fullFormatter.format(edge.weight)}
              </span>
              <span
                className={`hidden sm:block text-right font-semibold ${
                  edge.deltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {edge.deltaPct >= 0 ? '+' : ''}
                {edge.deltaPct.toFixed(0)}%
              </span>
              <span
                className={`hidden sm:block text-right font-semibold ${
                  edge.riskScore >= 65 ? 'text-rose-600' : 'text-slate-600'
                }`}
              >
                {edge.riskScore.toFixed(0)}
              </span>
            </button>
          )
        })}
        {!rows.length ? (
          <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center'>
            Sin enlaces suficientes para la matriz.
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ConnectionMatrix
