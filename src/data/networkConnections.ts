import type { SocialPost } from '../types'
import type { Sentiment } from '../types'

export type NetworkLevel = 'cluster' | 'subcluster' | 'microcluster'

export type NetworkNode = {
  id: string
  label: string
  volume: number
  reach: number
  sentimentIndex: number
  riskScore: number
  dominantSentiment: Sentiment
  topTopics: { name: string; count: number }[]
  degree: number
  weightedDegree: number
}

export type NetworkEdge = {
  id: string
  source: string
  target: string
  weight: number
  prevWeight: number
  deltaPct: number
  sentimentIndex: number
  riskScore: number
}

export type NetworkMetrics = {
  nodes: number
  edges: number
  density: number
  polarization: number
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const dominantSentiment = (sentiments: Record<Sentiment, number>) => {
  const entries = Object.entries(sentiments) as [Sentiment, number][]
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
}

const calcPolarization = (posts: SocialPost[]) => {
  const sentiments = posts.reduce(
    (acc, post) => {
      acc[post.sentiment] += 1
      return acc
    },
    { positivo: 0, neutral: 0, negativo: 0 }
  )
  const total = sentiments.positivo + sentiments.neutral + sentiments.negativo
  if (!total) return 0
  const shares = [
    sentiments.positivo / total,
    sentiments.neutral / total,
    sentiments.negativo / total,
  ]
  const baseline = 1 / 3
  const spread = shares.reduce((acc, s) => acc + Math.abs(s - baseline), 0)
  const maxSpread = 4 / 3
  return Math.min(100, (spread / maxSpread) * 100)
}

const getNodeKey = (post: SocialPost, level: NetworkLevel) => {
  if (level === 'cluster') return post.cluster
  if (level === 'subcluster') return post.subcluster
  return post.microcluster
}

type NodeAccumulator = {
  id: string
  label: string
  volume: number
  reach: number
  sentiments: Record<Sentiment, number>
  topicCount: Map<string, number>
  positiveReach: number
  neutralReach: number
  negativeReach: number
}

const initAccumulator = (id: string): NodeAccumulator => ({
  id,
  label: id,
  volume: 0,
  reach: 0,
  sentiments: { positivo: 0, neutral: 0, negativo: 0 },
  topicCount: new Map(),
  positiveReach: 0,
  neutralReach: 0,
  negativeReach: 0,
})

const buildSnapshot = (posts: SocialPost[], level: NetworkLevel) => {
  const nodes = new Map<string, NodeAccumulator>()
  const units = new Map<string, Set<string>>()

  posts.forEach((post) => {
    const nodeId = getNodeKey(post, level)
    const acc = nodes.get(nodeId) ?? initAccumulator(nodeId)
    acc.volume += 1
    acc.reach += post.reach
    acc.sentiments[post.sentiment] += 1
    acc.topicCount.set(post.topic, (acc.topicCount.get(post.topic) ?? 0) + 1)
    const weight = post.reach > 0 ? post.reach : 1
    if (post.sentiment === 'positivo') acc.positiveReach += weight
    if (post.sentiment === 'neutral') acc.neutralReach += weight
    if (post.sentiment === 'negativo') acc.negativeReach += weight
    nodes.set(nodeId, acc)

    const unitKey = `${post.author}-${dayKey(new Date(post.timestamp))}`
    const set = units.get(unitKey) ?? new Set<string>()
    set.add(nodeId)
    units.set(unitKey, set)
  })

  const edgeMap = new Map<string, { source: string; target: string; weight: number }>()
  const addEdge = (a: string, b: string) => {
    const [source, target] = a < b ? [a, b] : [b, a]
    const key = `${source}__${target}`
    const entry = edgeMap.get(key) ?? { source, target, weight: 0 }
    entry.weight += 1
    edgeMap.set(key, entry)
  }

  units.forEach((nodeSet) => {
    const arr = Array.from(nodeSet)
    if (arr.length < 2) return
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        addEdge(arr[i], arr[j])
      }
    }
  })

  if (edgeMap.size < 3) {
    const cityUnits = new Map<string, Set<string>>()
    posts.forEach((post) => {
      const nodeId = getNodeKey(post, level)
      const unitKey = `${post.location.city}-${dayKey(new Date(post.timestamp))}`
      const set = cityUnits.get(unitKey) ?? new Set<string>()
      set.add(nodeId)
      cityUnits.set(unitKey, set)
    })
    cityUnits.forEach((nodeSet) => {
      const arr = Array.from(nodeSet)
      if (arr.length < 2) return
      for (let i = 0; i < arr.length; i += 1) {
        for (let j = i + 1; j < arr.length; j += 1) {
          addEdge(arr[i], arr[j])
        }
      }
    })
  }

  return { nodes, edgeMap }
}

export const buildNetworkData = (
  currentPosts: SocialPost[],
  prevPosts: SocialPost[],
  level: NetworkLevel
) => {
  const current = buildSnapshot(currentPosts, level)
  const prev = buildSnapshot(prevPosts, level)

  const nodes: NetworkNode[] = Array.from(current.nodes.values()).map((acc) => {
    const total = acc.sentiments.positivo + acc.sentiments.neutral + acc.sentiments.negativo
    const sentimentIndex = total
      ? ((acc.sentiments.positivo + acc.sentiments.neutral * 0.5) / total) * 100
      : 0
    const reachTotal = acc.reach || 1
    const riskRaw =
      (acc.negativeReach * 1.2 + acc.neutralReach * 0.5 - acc.positiveReach * 0.3) /
      reachTotal
    const riskScore = Math.min(100, Math.max(0, riskRaw * 100))
    const topTopics = Array.from(acc.topicCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    return {
      id: acc.id,
      label: acc.label,
      volume: acc.volume,
      reach: acc.reach,
      sentimentIndex,
      riskScore,
      dominantSentiment: dominantSentiment(acc.sentiments),
      topTopics,
      degree: 0,
      weightedDegree: 0,
    }
  })

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

  const edges: NetworkEdge[] = Array.from(current.edgeMap.values()).map((edge) => {
    const prevKey = `${edge.source}__${edge.target}`
    const prevEdge = prev.edgeMap.get(prevKey)
    const prevWeight = prevEdge?.weight ?? 0
    const sourceNode = nodeLookup.get(edge.source)
    const targetNode = nodeLookup.get(edge.target)
    const sentimentIndex = sourceNode && targetNode
      ? (sourceNode.sentimentIndex + targetNode.sentimentIndex) / 2
      : 50
    const riskScore = sourceNode && targetNode
      ? (sourceNode.riskScore + targetNode.riskScore) / 2
      : 0
    return {
      id: prevKey,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      prevWeight,
      deltaPct: pctChange(edge.weight, prevWeight),
      sentimentIndex,
      riskScore,
    }
  })

  edges.forEach((edge) => {
    const source = nodeLookup.get(edge.source)
    const target = nodeLookup.get(edge.target)
    if (source) {
      source.degree += 1
      source.weightedDegree += edge.weight
    }
    if (target) {
      target.degree += 1
      target.weightedDegree += edge.weight
    }
  })

  const nodesCount = nodes.length
  const edgesCount = edges.length
  const possibleEdges = nodesCount > 1 ? (nodesCount * (nodesCount - 1)) / 2 : 0
  const density = possibleEdges ? (edgesCount / possibleEdges) * 100 : 0

  const metrics: NetworkMetrics = {
    nodes: nodesCount,
    edges: edgesCount,
    density,
    polarization: calcPolarization(currentPosts),
  }

  return { nodes, edges, metrics }
}
