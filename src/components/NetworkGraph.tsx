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

const viewBox = { width: 1000, height: 700 }
const viewMin = Math.min(viewBox.width, viewBox.height)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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

const computeCircularLayout = (nodes: NetworkNode[], radii: Map<string, number>) => {
  const radius = nodes.length > 16 ? 0.42 : 0.36
  const center = { x: 0.5, y: 0.5 }
  const sorted = [...nodes].sort((a, b) => (radii.get(b.id) ?? 0) - (radii.get(a.id) ?? 0))
  return new Map(
    sorted.map((node, index) => {
      const angle = (index / Math.max(1, sorted.length)) * Math.PI * 2
      const nodeRadius = radii.get(node.id) ?? 0
      const radial = Math.max(0.12, radius - nodeRadius)
      return [node.id, { x: center.x + Math.cos(angle) * radial, y: center.y + Math.sin(angle) * radial }]
    })
  )
}

type SentimentKey = 'positivo' | 'neutral' | 'negativo'

const computeCommunityLayout = (nodes: NetworkNode[], radii: Map<string, number>) => {
  const groups: Record<SentimentKey, NetworkNode[]> = { positivo: [], neutral: [], negativo: [] }
  nodes.forEach((node) => {
    groups[node.dominantSentiment].push(node)
  })

  const centers: Record<SentimentKey, { x: number; y: number }> = {
    positivo: { x: 0.25, y: 0.5 },
    neutral: { x: 0.5, y: 0.5 },
    negativo: { x: 0.75, y: 0.5 },
  }

  const positions = new Map<string, { x: number; y: number }>()
  const margin = 0.06
  const placeSpiral = (group: NetworkNode[], center: { x: number; y: number }, offset: number) => {
    const sorted = [...group].sort((a, b) => (radii.get(b.id) ?? 0) - (radii.get(a.id) ?? 0))
    sorted.forEach((node, index) => {
      const angle = offset + index * 0.82
      const ring = 0.03 + Math.sqrt(index) * 0.045
      const nodeRadius = radii.get(node.id) ?? 0
      const radius = ring + nodeRadius
      positions.set(node.id, {
        x: clamp(center.x + Math.cos(angle) * radius, margin, 1 - margin),
        y: clamp(center.y + Math.sin(angle) * radius, margin, 1 - margin),
      })
    })
  }
  ;(Object.keys(groups) as SentimentKey[]).forEach((key) => {
    const group = groups[key]
    placeSpiral(group, centers[key], key === 'neutral' ? 0.3 : key === 'positivo' ? 0.1 : 0.5)
  })

  return positions
}

const computeForceLayout = (nodes: NetworkNode[], edges: NetworkEdge[], radii: Map<string, number>) => {
  const positions = new Map<string, { x: number; y: number }>()
  const velocities = new Map<string, { x: number; y: number }>()
  const margin = 0.05

  const sorted = [...nodes].sort((a, b) => (radii.get(b.id) ?? 0) - (radii.get(a.id) ?? 0))
  sorted.forEach((node, index) => {
    const angle = index * 0.7
    const ring = 0.14 + Math.sqrt(index) * 0.045
    positions.set(node.id, {
      x: clamp(0.5 + Math.cos(angle) * ring, margin, 1 - margin),
      y: clamp(0.5 + Math.sin(angle) * ring, margin, 1 - margin),
    })
    velocities.set(node.id, { x: 0, y: 0 })
  })

  const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight))
  const baseDistance = 0.22
  const minDistance = 0.08
  const repulsion = nodes.length > 40 ? 0.0016 : 0.0022
  const gravity = 0.0045
  const damping = 0.84
  const maxStep = 0.02

  const iterations = Math.min(140, 50 + nodes.length * 3)

  for (let step = 0; step < iterations; step += 1) {
    const forces = new Map<string, { x: number; y: number }>()
    nodes.forEach((node) => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    const cooling = 1 - step / iterations
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        const posA = positions.get(a.id)!
        const posB = positions.get(b.id)!
        const dx = posA.x - posB.x
        const dy = posA.y - posB.y
        const dist = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy))
        const distSq = Math.max(0.0001, dist * dist)
        const minDist = (radii.get(a.id) ?? 0) + (radii.get(b.id) ?? 0) + 0.012
        const overlap = Math.max(0, minDist - dist)
        const force = (repulsion / distSq + overlap * 0.6) * cooling
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
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
      const weightScale = edge.weight / maxWeight
      const target = Math.max(minDistance, baseDistance - weightScale * 0.12)
      const delta = dist - target
      const force = delta * (0.05 + weightScale * 0.08) * cooling
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
      const velocity = velocities.get(node.id)!
      force.x += (0.5 - pos.x) * gravity
      force.y += (0.5 - pos.y) * gravity
      velocity.x = (velocity.x + force.x) * damping
      velocity.y = (velocity.y + force.y) * damping
      velocity.x = clamp(velocity.x, -maxStep, maxStep)
      velocity.y = clamp(velocity.y, -maxStep, maxStep)
      const nextX = clamp(pos.x + velocity.x, margin, 1 - margin)
      const nextY = clamp(pos.y + velocity.y, margin, 1 - margin)
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
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const activeNodeId = selectedNodeId ?? hoveredNodeId
  const activeEdgeId = selectedEdgeId ?? hoveredEdgeId
  const filteredEdges = useMemo(
    () => edges.filter((edge) => edge.weight >= minWeight),
    [edges, minWeight]
  )

  const maxValue = useMemo(() => {
    if (!nodes.length) return 1
    return Math.max(...nodes.map((node) => (sizeBy === 'reach' ? node.reach : node.volume)))
  }, [nodes, sizeBy])

  const nodeRadii = useMemo(() => {
    const map = new Map<string, number>()
    nodes.forEach((node) => {
      const value = sizeBy === 'reach' ? node.reach : node.volume
      const normalized = maxValue ? value / maxValue : 0
      const radius = 8 + normalized * 16
      map.set(node.id, radius)
    })
    return map
  }, [nodes, sizeBy, maxValue])

  const layoutRadii = useMemo(() => {
    const map = new Map<string, number>()
    nodeRadii.forEach((radius, id) => {
      map.set(id, radius / viewMin)
    })
    return map
  }, [nodeRadii])

  const positions = useMemo(() => {
    if (!nodes.length) return new Map<string, { x: number; y: number }>()
    if (layout === 'circular') return computeCircularLayout(nodes, layoutRadii)
    if (layout === 'community') return computeCommunityLayout(nodes, layoutRadii)
    return computeForceLayout(nodes, filteredEdges, layoutRadii)
  }, [nodes, layout, filteredEdges, layoutRadii])

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
      .slice(0, 8)
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

      <div className='mt-4 relative h-[420px] sm:h-[520px] xl:h-[620px] rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden'>
        {!nodes.length ? (
          <div className='h-full grid place-items-center text-sm text-slate-500'>
            Sin conexiones suficientes para mostrar el grafo.
          </div>
        ) : (
          <svg viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} className='w-full h-full'>
            <defs>
              <radialGradient id='graph-bg' cx='50%' cy='40%' r='70%'>
                <stop offset='0%' stopColor='#f8fafc' />
                <stop offset='100%' stopColor='#e2e8f0' />
              </radialGradient>
              <pattern id='graph-grid' width='48' height='48' patternUnits='userSpaceOnUse'>
                <path d='M 48 0 L 0 0 0 48' fill='none' stroke='#e2e8f0' strokeWidth='1' />
              </pattern>
              <filter id='node-shadow' x='-50%' y='-50%' width='200%' height='200%'>
                <feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#0f172a' floodOpacity='0.18' />
              </filter>
              <filter id='node-focus' x='-60%' y='-60%' width='220%' height='220%'>
                <feDropShadow dx='0' dy='4' stdDeviation='6' floodColor='#0f172a' floodOpacity='0.35' />
              </filter>
            </defs>
            <rect width='100%' height='100%' fill='url(#graph-bg)' />
            <rect width='100%' height='100%' fill='url(#graph-grid)' opacity='0.35' />
            <g>
              {filteredEdges.map((edge) => {
                const source = positions.get(edge.source)
                const target = positions.get(edge.target)
                if (!source || !target) return null
                const isSelected = edge.id === activeEdgeId
                const isConnected = activeNodeId
                  ? edge.source === activeNodeId || edge.target === activeNodeId
                  : true
                const strokeOpacity = isSelected ? 0.95 : isConnected ? 0.45 : 0.12
                const strokeWidth = (edge.weight / maxEdge) * 3.8 + (isSelected ? 1.8 : 0.6)
                const sx = source.x * viewBox.width
                const sy = source.y * viewBox.height
                const tx = target.x * viewBox.width
                const ty = target.y * viewBox.height
                const dx = tx - sx
                const dy = ty - sy
                const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
                const curvature = (rand(seedFromString(edge.id)) - 0.5) * 0.18
                const cx = (sx + tx) / 2 - (dy / dist) * dist * curvature
                const cy = (sy + ty) / 2 + (dx / dist) * dist * curvature
                const path = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`
                return (
                  <path
                    key={edge.id}
                    d={path}
                    stroke={isSelected ? '#0f172a' : edgeColor(edge.sentimentIndex)}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                    strokeLinecap='round'
                    fill='none'
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  />
                )
              })}
            </g>
            <g>
              {nodes.map((node) => {
                const pos = positions.get(node.id)
                if (!pos) return null
                const radius = nodeRadii.get(node.id) ?? 10
                const isSelected = node.id === selectedNodeId
                const isDimmed = activeNodeId && !highlightSet.has(node.id)
                return (
                  <g key={node.id}>
                    {isSelected ? (
                      <circle
                        cx={pos.x * viewBox.width}
                        cy={pos.y * viewBox.height}
                        r={radius + 6}
                        fill={sentimentColor[node.dominantSentiment]}
                        fillOpacity={0.18}
                      />
                    ) : null}
                    <circle
                      cx={pos.x * viewBox.width}
                      cy={pos.y * viewBox.height}
                      r={isSelected ? radius + 2 : radius}
                      fill={sentimentColor[node.dominantSentiment]}
                      fillOpacity={isDimmed ? 0.35 : 0.9}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      filter={isSelected ? 'url(#node-focus)' : 'url(#node-shadow)'}
                      className='cursor-pointer'
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => onNodeSelect(isSelected ? null : node.id)}
                    />
                    {labelSet.has(node.id) ? (
                      <text
                        x={pos.x * viewBox.width}
                        y={pos.y * viewBox.height - radius - 6}
                        textAnchor='middle'
                        fontSize='12'
                        fill='#0f172a'
                        style={{ fontWeight: 600, paintOrder: 'stroke', stroke: '#f8fafc', strokeWidth: 4 }}
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
