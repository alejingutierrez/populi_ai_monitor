import type { FC } from 'react'
import type { NetworkEdge, NetworkNode } from '../data/networkConnections'

interface Props {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  selectedNodeId?: string | null
}

const fullFormatter = new Intl.NumberFormat('es-PR')

const NetworkInsightsPanel: FC<Props> = ({ nodes, edges, selectedNodeId }) => {
  const selectedNode = selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) : undefined

  const topNodes = [...nodes]
    .sort((a, b) => b.weightedDegree - a.weightedDegree)
    .slice(0, 5)

  const criticalEdges = [...edges]
    .filter((edge) => edge.deltaPct >= 30 || edge.sentimentIndex <= 40 || edge.riskScore >= 65)
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 3)

  const communities = ['positivo', 'neutral', 'negativo'].map((tone) => {
    const group = nodes
      .filter((node) => node.dominantSentiment === tone)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
    return {
      tone,
      nodes: group,
      volume: group.reduce((acc, node) => acc + node.volume, 0),
    }
  })

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header'>
        <div>
          <p className='muted'>Network Connections</p>
          <p className='h-section'>Insight rail</p>
        </div>
      </div>

      {selectedNode ? (
        <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
          <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>Nodo activo</p>
          <div className='mt-2 flex items-center justify-between text-sm font-semibold text-ink'>
            <span>{selectedNode.label}</span>
            <span className='text-xs text-slate-500'>
              {fullFormatter.format(selectedNode.volume)} menciones
            </span>
          </div>
          <div className='mt-2 text-[11px] text-slate-500 space-y-1'>
            <p>Reach: {fullFormatter.format(selectedNode.reach)}</p>
            <p>Centralidad: {selectedNode.weightedDegree.toFixed(0)}</p>
            <p>Sentimiento: {selectedNode.sentimentIndex.toFixed(1)} / 100</p>
            <p>Riesgo: {selectedNode.riskScore.toFixed(1)} / 100</p>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[11px] font-semibold'>
            {selectedNode.topTopics.map((topic) => (
              <span
                key={topic.name}
                className='rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600'
              >
                {topic.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className='mt-3 space-y-3'>
        <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
          <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>Top nodos</p>
          <div className='mt-2 space-y-2'>
            {topNodes.map((node) => (
              <div key={node.id} className='flex items-center justify-between text-xs text-slate-600'>
                <span className='font-semibold text-slate-700'>{node.label}</span>
                <span>{node.weightedDegree.toFixed(0)} enlaces</span>
              </div>
            ))}
            {!topNodes.length ? (
              <p className='text-xs text-slate-500'>Sin nodos destacados.</p>
            ) : null}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
          <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>Enlaces criticos</p>
          <div className='mt-2 space-y-2'>
            {criticalEdges.map((edge) => (
              <div key={edge.id} className='flex items-center justify-between text-xs text-slate-600'>
                <span className='font-semibold text-slate-700'>
                  {edge.source} → {edge.target}
                </span>
                <span className={edge.deltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {edge.deltaPct >= 0 ? '+' : ''}
                  {edge.deltaPct.toFixed(0)}%
                </span>
              </div>
            ))}
            {!criticalEdges.length ? (
              <p className='text-xs text-slate-500'>Sin enlaces criticos.</p>
            ) : null}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
          <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>Comunidades</p>
          <div className='mt-2 space-y-2'>
            {communities.map((community) => (
              <div key={community.tone} className='text-xs text-slate-600'>
                <p className='font-semibold text-slate-700 capitalize'>{community.tone}</p>
                <p className='text-[11px] text-slate-500'>
                  {community.nodes.map((node) => node.label).join(' · ') || 'Sin nodos'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default NetworkInsightsPanel
