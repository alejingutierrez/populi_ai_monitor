import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { useMemo, useState, type FC } from 'react'
import type { NetworkEdge, NetworkLevel, NetworkNode } from '../data/networkConnections'

export type GraphLayout = 'force' | 'circular' | 'community'
export type NodeSizeMode = 'volume' | 'reach'

interface Props {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  level: NetworkLevel
  layout: GraphLayout
  sizeBy: NodeSizeMode
  minWeight: number
  maxWeight: number
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  onLevelChange: (level: NetworkLevel) => void
  onLayoutChange: (layout: GraphLayout) => void
  onSizeByChange: (mode: NodeSizeMode) => void
  onThresholdChange: (value: number) => void
  onNodeSelect: (id: string | null) => void
}

const sentimentColor = {
  positivo: '#16a34a',
  neutral: '#64748b',
  negativo: '#dc2626',
}

const edgeColor = (sentimentIndex: number) => {
  if (sentimentIndex >= 65) return '#16a34a'
  if (sentimentIndex <= 40) return '#dc2626'
  return '#2563eb'
}

const seedFromString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const rand = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const computeCircularLayout = (nodes: NetworkNode[]) => {
  const radius = 0.35
  const center = { x: 0.5, y: 0.5 }
  return new Map(
    nodes.map((node, index) => {
      const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2
      return [node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }]
    })
  )
}

const computeCommunityLayout = (nodes: NetworkNode[]) => {
  const groups: Record<string, NetworkNode[]> = { positivo: [], neutral: [], negativo: [] }
  nodes.forEach((node) => {
    groups[node.dominantSentiment].push(node)
  })

  const centers = {
    positivo: { x: 0.25, y: 0.5 },
    neutral: { x: 0.5, y: 0.5 },
    negativo: { x: 0.75, y: 0.5 },
  }

  const positions = new Map<string, { x: number; y: number }>()
  ;(Object.keys(groups) as Array<keyof typeof groups>).forEach((key) => {
    const group = groups[key]
    const radius = 0.16
    group.forEach((node, index) => {
      const angle = (index / Math.max(1, group.length)) * Math.PI * 2
      positions.set(node.id, {
        x: centers[key].x + Math.cos(angle) * radius,
        y: centers[key].y + Math.sin(angle) * radius,
      })
    })
  })

  return positions
}

const computeForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
  const positions = new Map<string, { x: number; y: number }>()
  nodes.forEach((node) => {
    const seed = seedFromString(node.id)
    positions.set(node.id, {
      x: 0.2 + rand(seed) * 0.6,
      y: 0.2 + rand(seed + 13) * 0.6,
    })
  })

  const iterations = Math.min(80, 30 + nodes.length * 2)
  const repulsion = 0.002
  const attraction = 0.0008
  const gravity = 0.0015

  for (let step = 0; step < iterations; step += 1) {
    const forces = new Map<string, { x: number; y: number }>()
    nodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const posA = positions.get(a.id)!
        const posB = positions.get(b.id)!
        const dx = posA.x - posB.x
        const dy = posA.y - posB.y
        const distSq = Math.max(0.0001, dx * dx + dy * dy)
        const force = repulsion / distSq
        const fx = force * dx
        const fy = force * dy
        forces.get(a.id)!.x += fx
        forces.get(a.id)!.y += fy
        forces.get(b.id)!.x -= fx
        forces.get(b.id)!.y -= fy
      }
    }

    edges.forEach((edge) => {
      const posA = positions.get(edge.source)
      const posB = positions.get(edge.target)
      if (!posA || !posB) return
      const dx = posB.x - posA.x
      const dy = posB.y - posA.y
      const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))
      const force = attraction * edge.weight
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      forces.get(edge.source)!.x += fx
      forces.get(edge.source)!.y += fy
      forces.get(edge.target)!.x -= fx
      forces.get(edge.target)!.y -= fy
    })

    nodes.forEach((node) => {
      const pos = positions.get(node.id)!
      const force = forces.get(node.id)!
      force.x += (0.5 - pos.x) * gravity
      force.y += (0.5 - pos.y) * gravity
      const nextX = Math.min(0.95, Math.max(0.05, pos.x + force.x))
      const nextY = Math.min(0.95, Math.max(0.05, pos.y + force.y))
      positions.set(node.id, { x: nextX, y: nextY })
    })
  }

  return positions
}

const NetworkGraph: FC<Props> = ({
  nodes,
  edges,
  level,
  layout,
  sizeBy,
  minWeight,
  maxWeight,
  selectedNodeId,
  selectedEdgeId,
  onLevelChange,
  onLayoutChange,
  onSizeByChange,
  onThresholdChange,
  onNodeSelect,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const activeNodeId = selectedNodeId ?? hoveredNodeId
  const filteredEdges = useMemo(
    () => edges.filter((edge) => edge.weight >= minWeight),
    [edges, minWeight]
  )

  const positions = useMemo(() => {
    if (!nodes.length) return new Map<string, { x: number; y: number }>()
    if (layout === 'circular') return computeCircularLayout(nodes)
    if (layout === 'community') return computeCommunityLayout(nodes)
    return computeForceLayout(nodes, filteredEdges)
  }, [nodes, layout, filteredEdges])

  const maxValue = useMemo(() => {
    if (!nodes.length) return 1
    return Math.max(...nodes.map((node) => (sizeBy === 'reach' ? node.reach : node.volume)))
  }, [nodes, sizeBy])

  const maxEdge = useMemo(() => {
    if (!filteredEdges.length) return 1
    return Math.max(...filteredEdges.map((edge) => edge.weight))
  }, [filteredEdges])

  const highlightSet = useMemo(() => {
    if (!activeNodeId) return new Set<string>()
    const neighbors = new Set<string>([activeNodeId])
    filteredEdges.forEach((edge) => {
      if (edge.source === activeNodeId) neighbors.add(edge.target)
      if (edge.target === activeNodeId) neighbors.add(edge.source)
    })
    return neighbors
  }, [activeNodeId, filteredEdges])

  const labelSet = useMemo(() => {
    const top = [...nodes]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 6)
      .map((node) => node.id)
    const set = new Set(top)
    if (selectedNodeId) set.add(selectedNodeId)
    if (hoveredNodeId) set.add(hoveredNodeId)
    return set
  }, [hoveredNodeId, nodes, selectedNodeId])

  return (
    <section className='card p-4 min-w-0'>
      <div className='card-header items-start gap-4 flex-col lg:flex-row lg:items-center'>
        <div>
          <p className='muted'>Network Connections</p>
          <p className='h-section'>Grafo de relaciones</p>
          <p className='text-xs text-slate-500 mt-1'>Nivel activo: {level}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold'>
          {(['cluster', 'subcluster', 'microcluster'] as NetworkLevel[]).map((item) => (
            <button
              key={item}
              type='button'
              onClick={() => onLevelChange(item)}
              className={`px-2.5 py-1 rounded-full border transition ${
                level === item
                  ? 'border-prBlue bg-prBlue/10 text-prBlue'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600'>
        <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1'>
          <AdjustmentsHorizontalIcon className='h-3.5 w-3.5' /> Layout
        </span>
        {(['force', 'circular', 'community'] as GraphLayout[]).map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => onLayoutChange(item)}
            className={`px-2.5 py-1 rounded-full border transition ${
              layout === item
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
        <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1'>
          Tamaño
        </span>
        {(['volume', 'reach'] as NodeSizeMode[]).map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => onSizeByChange(item)}
            className={`px-2.5 py-1 rounded-full border transition ${
              sizeBy === item
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item}
          </button>
        ))}
        <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1'>
          Umbral enlaces: {minWeight}
        </span>
        <input
          type='range'
          min={1}
          max={Math.max(1, maxWeight)}
          step={1}
          value={minWeight}
          onChange={(event) => onThresholdChange(Number(event.target.value))}
          className='w-32 accent-prBlue'
        />
       </div>

      <div className='mt-4 relative h-[420px] sm:h-[520px] rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden'>
        {!nodes.length ? (
          <div className='h-full grid place-items-center text-sm text-slate-500'>
            Sin conexiones suficientes para mostrar el grafo.
          </div>
        ) : (
          <svg viewBox='0 0 1000 700' className='w-full h-full'>
            <g>
              {filteredEdges.map((edge) => {
                const source = positions.get(edge.source)
                const target = positions.get(edge.target)
                if (!source || !target) return null
                const isSelected = edge.id === selectedEdgeId
                const isConnected = activeNodeId
                  ? edge.source === activeNodeId || edge.target === activeNodeId
                  : true
                const strokeOpacity = isSelected ? 0.9 : isConnected ? 0.45 : 0.15
                const strokeWidth =
                  (edge.weight / maxEdge) * 4 + (isSelected ? 1.5 : 0.5)
                return (
                  <line
                    key={edge.id}
                    x1={source.x * 1000}
                    y1={source.y * 700}
                    x2={target.x * 1000}
                    y2={target.y * 700}
                    stroke={isSelected ? '#0f172a' : edgeColor(edge.sentimentIndex)}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                  />
                )
              })}
            </g>
            <g>
              {nodes.map((node) => {
                const pos = positions.get(node.id)
                if (!pos) return null
                const value = sizeBy === 'reach' ? node.reach : node.volume
                const radius = 6 + (value / maxValue) * 14
                const isSelected = node.id === selectedNodeId
                const isDimmed = activeNodeId && !highlightSet.has(node.id)
                return (
                  <g key={node.id}>
                    <circle
                      cx={pos.x * 1000}
                      cy={pos.y * 700}
                      r={isSelected ? radius + 2 : radius}
                      fill={sentimentColor[node.dominantSentiment]}
                      fillOpacity={isDimmed ? 0.35 : 0.85}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => onNodeSelect(isSelected ? null : node.id)}
                    />
                    {labelSet.has(node.id) ? (
                      <text
                        x={pos.x * 1000}
                        y={pos.y * 700 - radius - 6}
                        textAnchor='middle'
                        fontSize='12'
                        fill='#0f172a'
                        style={{ fontWeight: 600 }}
                      >
                        {node.label}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500'>
        <span className='inline-flex items-center gap-2'>
          <span className='h-2.5 w-2.5 rounded-full bg-emerald-500' /> Positivo
        </span>
        <span className='inline-flex items-center gap-2'>
          <span className='h-2.5 w-2.5 rounded-full bg-slate-500' /> Neutral
        </span>
        <span className='inline-flex items-center gap-2'>
          <span className='h-2.5 w-2.5 rounded-full bg-rose-500' /> Negativo
        </span>
        <span className='inline-flex items-center gap-2'>
          <span className='h-0.5 w-6 bg-blue-600/60' /> Co-ocurrencia
        </span>
      </div>
    </section>
  )
}

export default NetworkGraph
