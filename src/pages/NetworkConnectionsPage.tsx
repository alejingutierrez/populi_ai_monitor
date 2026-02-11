import type { FC } from 'react'
import { useMemo, useState } from 'react'
import ConnectionMatrix from '../components/ConnectionMatrix'
import NetworkGraph, { type GraphLayout, type NodeSizeMode } from '../components/NetworkGraph'
import NetworkInsightsPanel from '../components/NetworkInsightsPanel'
import NetworkPulse from '../components/NetworkPulse'
import ResizableHorizontalSplit from '../components/ResizableHorizontalSplit'
import type { Filters } from '../components/FilterBar'
import SummaryGrid, { type SummaryMetrics } from '../components/SummaryGrid'
import {
  buildNetworkData,
  type NetworkLevel,
} from '../data/networkConnections'
import type { SocialPost } from '../types'

interface Props {
  metrics: SummaryMetrics
  posts: SocialPost[]
  filters: Filters
  search: string
}

const timeframeHours: Record<Filters['timeframe'], number> = {
  '24h': 24,
  '72h': 72,
  '7d': 24 * 7,
  '1m': 24 * 30,
  todo: 0,
}

const formatRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString('es-PR', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('es-PR', {
    month: 'short',
    day: 'numeric',
  })}`

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const NetworkConnectionsPage: FC<Props> = ({ metrics, posts, filters, search }) => {
  const [level, setLevel] = useState<NetworkLevel>('cluster')
  const [layout, setLayout] = useState<GraphLayout>('force')
  const [sizeBy, setSizeBy] = useState<NodeSizeMode>('volume')
  const [thresholdMode, setThresholdMode] = useState<'auto' | 'manual'>('auto')
  const [manualMinWeight, setManualMinWeight] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const { currentPosts, prevPosts, rangeLabel } = useMemo(() => {
    if (!posts.length) {
      return { currentPosts: [], prevPosts: [], rangeLabel: 'Sin datos' }
    }

    const matchesNonDateFilters = (post: SocialPost) => {
      if (filters.sentiment !== 'todos' && post.sentiment !== filters.sentiment) return false
      if (filters.platform !== 'todos' && post.platform !== filters.platform) return false
      if (filters.cluster !== 'todos' && post.cluster !== filters.cluster) return false
      if (filters.subcluster !== 'todos' && post.subcluster !== filters.subcluster) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic} ${post.cluster} ${post.subcluster} ${post.microcluster}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    }

    const matching = posts.filter(matchesNonDateFilters)
    if (!matching.length) {
      return { currentPosts: [], prevPosts: [], rangeLabel: 'Sin datos' }
    }

    const timestamps = matching.map((post) => new Date(post.timestamp).getTime())
    const maxTs = Math.max(...timestamps)
    const minTs = Math.min(...timestamps)

    let start = new Date(minTs)
    let end = new Date(maxTs)

    if (filters.dateFrom || filters.dateTo) {
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(minTs)
      end = filters.dateTo
        ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
        : new Date(maxTs)
    } else if (filters.timeframe !== 'todo') {
      end = new Date(maxTs)
      start = new Date(end.getTime() - timeframeHours[filters.timeframe] * 60 * 60 * 1000)
    }

    const windowMs = Math.max(1, end.getTime() - start.getTime())
    const prevStart = new Date(start.getTime() - windowMs)

    const current = matching.filter((post) => {
      const ts = new Date(post.timestamp).getTime()
      return ts >= start.getTime() && ts <= end.getTime()
    })
    const prev = matching.filter((post) => {
      const ts = new Date(post.timestamp).getTime()
      return ts >= prevStart.getTime() && ts < start.getTime()
    })

    return { currentPosts: current, prevPosts: prev, rangeLabel: formatRange(start, end) }
  }, [
    posts,
    filters.sentiment,
    filters.platform,
    filters.cluster,
    filters.subcluster,
    filters.timeframe,
    filters.dateFrom,
    filters.dateTo,
    search,
  ])

  const currentNetwork = useMemo(
    () => buildNetworkData(currentPosts, prevPosts, level),
    [currentPosts, prevPosts, level]
  )

  const prevNetwork = useMemo(
    () => buildNetworkData(prevPosts, [], level),
    [prevPosts, level]
  )

  const pulseStats = useMemo(
    () => ({
      nodes: currentNetwork.metrics.nodes,
      edges: currentNetwork.metrics.edges,
      density: currentNetwork.metrics.density,
      polarization: currentNetwork.metrics.polarization,
      rangeLabel,
      deltas: {
        nodesPct: pctChange(currentNetwork.metrics.nodes, prevNetwork.metrics.nodes),
        edgesPct: pctChange(currentNetwork.metrics.edges, prevNetwork.metrics.edges),
        densityPct: pctChange(currentNetwork.metrics.density, prevNetwork.metrics.density),
        polarizationPct: pctChange(currentNetwork.metrics.polarization, prevNetwork.metrics.polarization),
      },
    }),
    [currentNetwork.metrics, prevNetwork.metrics, rangeLabel]
  )

  const autoMinWeight = useMemo(() => {
    if (!currentNetwork.edges.length) return 1
    const weights = currentNetwork.edges.map((edge) => edge.weight).sort((a, b) => a - b)
    const median = weights[Math.floor(weights.length / 2)]
    return Math.max(1, median)
  }, [currentNetwork.edges])

  const maxWeight = useMemo(() => {
    if (!currentNetwork.edges.length) return 1
    return Math.max(...currentNetwork.edges.map((edge) => edge.weight))
  }, [currentNetwork.edges])

  const minWeight =
    thresholdMode === 'auto'
      ? autoMinWeight
      : Math.min(Math.max(1, manualMinWeight), Math.max(1, maxWeight))

  const handleThresholdChange = (value: number) => {
    setThresholdMode('manual')
    setManualMinWeight(value)
  }

  const handleLevelChange = (nextLevel: NetworkLevel) => {
    setLevel(nextLevel)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setThresholdMode('auto')
    setManualMinWeight(1)
  }

  return (
    <main className='p-4 md:p-6 space-y-6 overflow-y-auto'>
      <SummaryGrid metrics={metrics} />
      <NetworkPulse stats={pulseStats} />

      <ResizableHorizontalSplit
        storageKey='network-connections:graph-intel'
        defaultRatio={0.62}
        minRatio={0.42}
        maxRatio={0.78}
        left={
          <NetworkGraph
            nodes={currentNetwork.nodes}
            edges={currentNetwork.edges}
            level={level}
            layout={layout}
            sizeBy={sizeBy}
            minWeight={minWeight}
            maxWeight={maxWeight}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onLevelChange={handleLevelChange}
            onLayoutChange={setLayout}
            onSizeByChange={setSizeBy}
            onThresholdChange={handleThresholdChange}
            onNodeSelect={setSelectedNodeId}
          />
        }
        right={
          <NetworkInsightsPanel
            nodes={currentNetwork.nodes}
            edges={currentNetwork.edges}
            selectedNodeId={selectedNodeId}
          />
        }
      />

      <ConnectionMatrix
        edges={[...currentNetwork.edges].sort((a, b) => b.weight - a.weight)}
        selectedEdgeId={selectedEdgeId}
        onSelectEdge={setSelectedEdgeId}
      />
    </main>
  )
}

export default NetworkConnectionsPage
