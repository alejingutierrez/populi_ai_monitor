import type { SocialPost } from '../types'
import { calcRiskScore } from './geoInsights'

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertStatus = 'open' | 'ack' | 'snoozed' | 'resolved' | 'escalated'
export type AlertScopeType =
  | 'overall'
  | 'cluster'
  | 'subcluster'
  | 'microcluster'
  | 'city'
  | 'platform'

export type AlertSignalType = 'volume' | 'negativity' | 'risk' | 'viral'

export type AlertSignal = {
  type: AlertSignalType
  label: string
  value: number
  deltaPct?: number
}

export type AlertRuleValue = {
  value: number
  threshold: number
  deltaPct?: number
  deltaThreshold?: number
}

export type Alert = {
  id: string
  stableId?: string
  instanceId?: string
  title: string
  summary: string
  severity: AlertSeverity
  status: AlertStatus
  priority?: number
  owner?: string
  team?: string
  assignee?: string
  scopeType: AlertScopeType
  scopeId: string
  scopeLabel: string
  createdAt: string
  firstSeenAt?: string
  lastSeenAt: string
  lastStatusAt?: string
  ackAt?: string | null
  resolvedAt?: string | null
  snoozeUntil?: string | null
  occurrences?: number
  activeWindowCount?: number
  confidence?: number
  metrics: {
    volumeCurrent: number
    volumePrev: number
    volumeDeltaPct: number
    negativeShare: number
    riskScore: number
    reach: number
    engagement: number
    engagementRate: number
    impactScore: number
    impactRatio: number
  }
  signals: AlertSignal[]
  ruleIds?: AlertSignalType[]
  ruleValues?: Record<AlertSignalType, AlertRuleValue>
  topTopics: { name: string; count: number }[]
  topEntities?: { name: string; count: number }[]
  keywords?: { term: string; count: number }[]
  uniqueAuthors?: number
  newAuthorsPct?: number
  geoSpread?: number
  evidence: SocialPost[]
}

export type AlertTimelinePoint = {
  day: string
  total: number
  critical: number
  high: number
  medium: number
  low: number
}

export type AlertRuleStat = {
  id: AlertSignalType
  label: string
  threshold: string
  activeCount: number
}

export type AlertThresholds = {
  minVolume: number
  volumeSpikePct: number
  negativityPct: number
  riskScore: number
  viralImpactRatio: number
  viralDeltaPct: number
}

export const defaultAlertThresholds: AlertThresholds = {
  minVolume: 40,
  volumeSpikePct: 30,
  negativityPct: 35,
  riskScore: 45,
  viralImpactRatio: 1.3,
  viralDeltaPct: 20,
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

export const formatRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString('es-PR', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('es-PR', {
    month: 'short',
    day: 'numeric',
  })}`

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const buildTopTopics = (posts: SocialPost[], limit = 3) => {
  const topicCount = new Map<string, number>()
  posts.forEach((post) => {
    topicCount.set(post.topic, (topicCount.get(post.topic) ?? 0) + 1)
  })
  return Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

const buildTopEntities = (posts: SocialPost[], limit = 4) => {
  const entityCount = new Map<string, number>()
  posts.forEach((post) => {
    const key = (post.handle || post.author || '').trim()
    if (!key) return
    entityCount.set(key, (entityCount.get(key) ?? 0) + 1)
  })
  return Array.from(entityCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

const keywordStopwords = new Set([
  'que',
  'para',
  'como',
  'porque',
  'cuando',
  'donde',
  'este',
  'esta',
  'estos',
  'estas',
  'unos',
  'unas',
  'sobre',
  'desde',
  'hasta',
  'entre',
  'todo',
  'toda',
  'todas',
  'todos',
  'pero',
  'por',
  'con',
  'sin',
  'del',
  'las',
  'los',
  'una',
  'uno',
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
])

const extractTokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !keywordStopwords.has(token))

const buildKeywords = (posts: SocialPost[], limit = 6) => {
  const keywordCount = new Map<string, number>()
  posts.forEach((post) => {
    extractTokens(post.content).forEach((token) => {
      keywordCount.set(token, (keywordCount.get(token) ?? 0) + 1)
    })
  })
  return Array.from(keywordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }))
}

const calcImpactScore = (posts: SocialPost[]) => {
  if (!posts.length) return 0
  const reach = posts.reduce((acc, post) => acc + post.reach, 0)
  const engagement = posts.reduce((acc, post) => acc + post.engagement, 0)
  return (reach / posts.length) * 0.6 + (engagement / posts.length) * 0.4
}

const buildStats = (posts: SocialPost[], baselinePosts: SocialPost[] = []) => {
  const total = posts.length
  const reach = posts.reduce((acc, post) => acc + post.reach, 0)
  const engagement = posts.reduce((acc, post) => acc + post.engagement, 0)
  const negative = posts.filter((post) => post.sentiment === 'negativo').length
  const negativeShare = total ? (negative / total) * 100 : 0
  const engagementRate = reach ? (engagement / reach) * 100 : 0
  const riskScore = calcRiskScore(posts)
  const impactScore = total ? (reach / total) * 0.6 + (engagement / total) * 0.4 : 0
  const latestTs = posts.reduce(
    (max, post) => Math.max(max, new Date(post.timestamp).getTime()),
    0
  )
  const earliestTs = posts.reduce(
    (min, post) => Math.min(min, new Date(post.timestamp).getTime()),
    Number.POSITIVE_INFINITY
  )
  const authorKeys = new Set(
    posts
      .map((post) => (post.handle || post.author || '').trim().toLowerCase())
      .filter((value) => value)
  )
  const baselineAuthors = new Set(
    baselinePosts
      .map((post) => (post.handle || post.author || '').trim().toLowerCase())
      .filter((value) => value)
  )
  const newAuthors = Array.from(authorKeys).filter(
    (author) => !baselineAuthors.has(author)
  ).length
  const uniqueAuthors = authorKeys.size
  const newAuthorsPct = uniqueAuthors ? (newAuthors / uniqueAuthors) * 100 : 0
  const geoSpread = new Set(
    posts.map((post) => post.location.city).filter((value) => value)
  ).size
  return {
    total,
    reach,
    engagement,
    negativeShare,
    engagementRate,
    riskScore,
    impactScore,
    latestTs,
    earliestTs: Number.isFinite(earliestTs) ? earliestTs : 0,
    topTopics: buildTopTopics(posts, 3),
    topEntities: buildTopEntities(posts, 4),
    keywords: buildKeywords(posts, 6),
    uniqueAuthors,
    newAuthorsPct,
    geoSpread,
  }
}

const severityWeight = (severity: AlertSeverity) => {
  if (severity === 'critical') return 4
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  return 1
}

const calcPriority = (severity: AlertSeverity, riskScore: number) => {
  const base = severityWeight(severity) * 20
  const riskBoost = Math.min(40, riskScore * 0.6)
  return Math.round(Math.min(100, base + riskBoost))
}

const calcConfidence = (
  stats: ReturnType<typeof buildStats>,
  prevStats: ReturnType<typeof buildStats>,
  signals: AlertSignal[],
  thresholds: AlertThresholds
) => {
  const volumeScore = Math.min(1, stats.total / Math.max(1, thresholds.minVolume * 2))
  const signalScore = Math.min(1, signals.length / 3)
  const delta = Math.abs(stats.total - prevStats.total)
  const stabilityScore = stats.total
    ? 1 - Math.min(1, delta / Math.max(stats.total, prevStats.total || 1))
    : 0
  const raw = volumeScore * 0.45 + signalScore * 0.35 + stabilityScore * 0.2
  return Math.round(raw * 100)
}

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const buildStableId = (value: string) => `al_${hashString(value)}`

const buildInstanceId = (value: string) => `ai_${hashString(value)}`

const resolveSignalSeverity = (signal: AlertSignal, impactRatio: number) => {
  if (signal.type === 'volume') {
    if (signal.value >= 60) return 'critical'
    if (signal.value >= 45) return 'high'
    if (signal.value >= 30) return 'medium'
    return 'low'
  }
  if (signal.type === 'negativity') {
    if (signal.value >= 45) return 'critical'
    if (signal.value >= 40) return 'high'
    if (signal.value >= 35) return 'medium'
    return 'low'
  }
  if (signal.type === 'risk') {
    if (signal.value >= 60) return 'critical'
    if (signal.value >= 50) return 'high'
    if (signal.value >= 45) return 'medium'
    return 'low'
  }
  if (impactRatio >= 1.6) return 'critical'
  if (impactRatio >= 1.45) return 'high'
  if (impactRatio >= 1.3) return 'medium'
  return 'low'
}

const pickPrimarySignal = (signals: AlertSignal[], impactRatio: number) => {
  const sorted = [...signals].sort((a, b) => {
    const sa = resolveSignalSeverity(a, impactRatio)
    const sb = resolveSignalSeverity(b, impactRatio)
    return severityWeight(sb) - severityWeight(sa)
  })
  return sorted[0]
}

const buildSummary = (stats: ReturnType<typeof buildStats>, deltaPct: number) =>
  `Δ ${deltaPct.toFixed(0)}% · Negatividad ${stats.negativeShare.toFixed(0)}% · Riesgo ${stats.riskScore.toFixed(0)}`

const buildEvidence = (posts: SocialPost[]) => {
  const scored = posts
    .map((post) => ({
      post,
      score: post.reach * 0.6 + post.engagement * 0.4,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  return scored.map((item) => item.post)
}

const groupBy = (posts: SocialPost[], getKey: (post: SocialPost) => string) => {
  const groups = new Map<string, SocialPost[]>()
  posts.forEach((post) => {
    const key = getKey(post)
    if (!key) return
    groups.set(key, [...(groups.get(key) ?? []), post])
  })
  return groups
}

type GroupSpec = {
  scopeType: AlertScopeType
  label: string
  key: (post: SocialPost) => string
}

const scopeSpecs: GroupSpec[] = [
  { scopeType: 'cluster', label: 'Cluster', key: (post) => post.cluster },
  { scopeType: 'subcluster', label: 'Subcluster', key: (post) => post.subcluster },
  { scopeType: 'microcluster', label: 'Microcluster', key: (post) => post.microcluster },
  { scopeType: 'city', label: 'Municipio', key: (post) => post.location.city },
  { scopeType: 'platform', label: 'Plataforma', key: (post) => post.platform },
]

const buildSignals = (
  stats: ReturnType<typeof buildStats>,
  prevStats: ReturnType<typeof buildStats>,
  impactRatio: number,
  thresholds: AlertThresholds
) => {
  const deltaPct = pctChange(stats.total, prevStats.total)
  const signals: AlertSignal[] = []
  const ruleValues: Partial<Record<AlertSignalType, AlertRuleValue>> = {}

  if (stats.total >= thresholds.minVolume && deltaPct >= thresholds.volumeSpikePct) {
    signals.push({
      type: 'volume',
      label: 'Volumen en alza',
      value: deltaPct,
      deltaPct,
    })
    ruleValues.volume = {
      value: deltaPct,
      threshold: thresholds.volumeSpikePct,
      deltaPct,
    }
  }

  if (stats.total >= thresholds.minVolume && stats.negativeShare >= thresholds.negativityPct) {
    signals.push({
      type: 'negativity',
      label: 'Negatividad alta',
      value: stats.negativeShare,
    })
    ruleValues.negativity = {
      value: stats.negativeShare,
      threshold: thresholds.negativityPct,
    }
  }

  if (stats.total >= thresholds.minVolume && stats.riskScore >= thresholds.riskScore) {
    signals.push({
      type: 'risk',
      label: 'Riesgo reputacional',
      value: stats.riskScore,
    })
    ruleValues.risk = {
      value: stats.riskScore,
      threshold: thresholds.riskScore,
    }
  }

  if (
    stats.total >= thresholds.minVolume &&
    impactRatio >= thresholds.viralImpactRatio &&
    deltaPct >= thresholds.viralDeltaPct
  ) {
    signals.push({
      type: 'viral',
      label: 'Viralidad en aumento',
      value: impactRatio,
      deltaPct,
    })
    ruleValues.viral = {
      value: impactRatio,
      threshold: thresholds.viralImpactRatio,
      deltaPct,
      deltaThreshold: thresholds.viralDeltaPct,
    }
  }

  return { signals, deltaPct, ruleValues }
}

export const buildAlerts = (
  currentPosts: SocialPost[],
  prevPosts: SocialPost[],
  thresholds: Partial<AlertThresholds> = {}
) => {
  const baselineImpact = calcImpactScore(currentPosts)
  const dynamicMinVolume = Math.max(
    thresholds.minVolume ?? defaultAlertThresholds.minVolume,
    Math.round(currentPosts.length * 0.01)
  )
  const config: AlertThresholds = {
    ...defaultAlertThresholds,
    ...thresholds,
    minVolume: dynamicMinVolume,
  }

  const alerts: Array<Alert & { score: number }> = []

  const overallStats = buildStats(currentPosts, prevPosts)
  const overallPrev = buildStats(prevPosts)
  const overallImpactRatio = baselineImpact ? overallStats.impactScore / baselineImpact : 0
  const overallSignals = buildSignals(overallStats, overallPrev, overallImpactRatio, config)
  if (overallSignals.signals.length) {
    const primary = pickPrimarySignal(overallSignals.signals, overallImpactRatio)
    const severity = resolveSignalSeverity(primary, overallImpactRatio)
    const score =
      severityWeight(severity) * 100 +
      Math.max(
        overallSignals.deltaPct,
        overallStats.negativeShare,
        overallStats.riskScore,
        (overallImpactRatio - 1) * 100
      )
    const nowIso = new Date().toISOString()
    const stableId = buildStableId('overall:overall')
    const instanceBucket = dayKey(new Date(overallStats.latestTs || Date.now()))
    const instanceId = buildInstanceId(
      `overall:overall:${primary.type}:${instanceBucket}`
    )
    const confidence = calcConfidence(overallStats, overallPrev, overallSignals.signals, config)
    const priority = calcPriority(severity, overallStats.riskScore)

    alerts.push({
      id: 'overall',
      stableId,
      instanceId,
      title: `Panorama general · ${primary.label}`,
      summary: buildSummary(overallStats, overallSignals.deltaPct),
      severity,
      status: 'open',
      priority,
      scopeType: 'overall',
      scopeId: 'overall',
      scopeLabel: 'Panorama general',
      createdAt: nowIso,
      firstSeenAt: new Date(overallStats.earliestTs || Date.now()).toISOString(),
      lastSeenAt: new Date(overallStats.latestTs || Date.now()).toISOString(),
      lastStatusAt: nowIso,
      ackAt: null,
      resolvedAt: null,
      snoozeUntil: null,
      occurrences: 1,
      activeWindowCount: 1,
      confidence,
      metrics: {
        volumeCurrent: overallStats.total,
        volumePrev: overallPrev.total,
        volumeDeltaPct: overallSignals.deltaPct,
        negativeShare: overallStats.negativeShare,
        riskScore: overallStats.riskScore,
        reach: overallStats.reach,
        engagement: overallStats.engagement,
        engagementRate: overallStats.engagementRate,
        impactScore: overallStats.impactScore,
        impactRatio: overallImpactRatio,
      },
      signals: overallSignals.signals,
      ruleIds: overallSignals.signals.map((signal) => signal.type),
      ruleValues: overallSignals.ruleValues as Record<AlertSignalType, AlertRuleValue>,
      topTopics: overallStats.topTopics,
      topEntities: overallStats.topEntities,
      keywords: overallStats.keywords,
      uniqueAuthors: overallStats.uniqueAuthors,
      newAuthorsPct: overallStats.newAuthorsPct,
      geoSpread: overallStats.geoSpread,
      evidence: buildEvidence(currentPosts),
      score,
    })
  }

  scopeSpecs.forEach((scope) => {
    const groups = groupBy(currentPosts, scope.key)
    const prevGroups = groupBy(prevPosts, scope.key)

    groups.forEach((groupPosts, scopeId) => {
      const prevGroupPosts = prevGroups.get(scopeId) ?? []
      const stats = buildStats(groupPosts, prevGroupPosts)
      const prevStats = buildStats(prevGroupPosts)
      const impactRatio = baselineImpact ? stats.impactScore / baselineImpact : 0
      const { signals, deltaPct, ruleValues } = buildSignals(
        stats,
        prevStats,
        impactRatio,
        config
      )
      if (!signals.length) return

      const primary = pickPrimarySignal(signals, impactRatio)
      const severity = resolveSignalSeverity(primary, impactRatio)
      const score =
        severityWeight(severity) * 100 +
        Math.max(deltaPct, stats.negativeShare, stats.riskScore, (impactRatio - 1) * 100)

      const nowIso = new Date().toISOString()
      const stableId = buildStableId(`${scope.scopeType}:${scopeId}`)
      const instanceBucket = dayKey(new Date(stats.latestTs || Date.now()))
      const instanceId = buildInstanceId(
        `${scope.scopeType}:${scopeId}:${primary.type}:${instanceBucket}`
      )
      const confidence = calcConfidence(stats, prevStats, signals, config)
      const priority = calcPriority(severity, stats.riskScore)

      alerts.push({
        id: `${scope.scopeType}:${scopeId}`,
        stableId,
        instanceId,
        title: `${scopeId} · ${primary.label}`,
        summary: buildSummary(stats, deltaPct),
        severity,
        status: 'open',
        priority,
        scopeType: scope.scopeType,
        scopeId,
        scopeLabel: scopeId,
        createdAt: nowIso,
        firstSeenAt: new Date(stats.earliestTs || Date.now()).toISOString(),
        lastSeenAt: new Date(stats.latestTs || Date.now()).toISOString(),
        lastStatusAt: nowIso,
        ackAt: null,
        resolvedAt: null,
        snoozeUntil: null,
        occurrences: 1,
        activeWindowCount: 1,
        confidence,
        metrics: {
          volumeCurrent: stats.total,
          volumePrev: prevStats.total,
          volumeDeltaPct: deltaPct,
          negativeShare: stats.negativeShare,
          riskScore: stats.riskScore,
          reach: stats.reach,
          engagement: stats.engagement,
          engagementRate: stats.engagementRate,
          impactScore: stats.impactScore,
          impactRatio,
        },
        signals,
        ruleIds: signals.map((signal) => signal.type),
        ruleValues: ruleValues as Record<AlertSignalType, AlertRuleValue>,
        topTopics: stats.topTopics,
        topEntities: stats.topEntities,
        keywords: stats.keywords,
        uniqueAuthors: stats.uniqueAuthors,
        newAuthorsPct: stats.newAuthorsPct,
        geoSpread: stats.geoSpread,
        evidence: buildEvidence(groupPosts),
        score,
      })
    })
  })

  return alerts
    .sort((a, b) => b.score - a.score)
    .slice(0, 32)
    .map(({ score, ...alert }) => alert)
}

export const buildAlertTimeline = (alerts: Alert[], start: Date, end: Date) => {
  const points = new Map<string, AlertTimelinePoint>()
  const cursor = new Date(start)

  while (cursor <= end) {
    const key = dayKey(cursor)
    points.set(key, {
      day: cursor.toLocaleDateString('es-PR', { month: 'short', day: 'numeric' }),
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  alerts.forEach((alert) => {
    const key = dayKey(new Date(alert.lastSeenAt))
    const point = points.get(key)
    if (!point) return
    point.total += 1
    point[alert.severity] += 1
  })

  return Array.from(points.values())
}

export const buildAlertRuleStats = (
  alerts: Alert[],
  thresholds: AlertThresholds
): AlertRuleStat[] => {
  const catalog: AlertRuleStat[] = [
    {
      id: 'volume',
      label: 'Spike de volumen',
      threshold: `≥ ${thresholds.volumeSpikePct}%`,
      activeCount: 0,
    },
    {
      id: 'negativity',
      label: 'Negatividad alta',
      threshold: `≥ ${thresholds.negativityPct}%`,
      activeCount: 0,
    },
    {
      id: 'risk',
      label: 'Riesgo reputacional',
      threshold: `≥ ${thresholds.riskScore} pts`,
      activeCount: 0,
    },
    {
      id: 'viral',
      label: 'Viralidad',
      threshold: `≥ ${thresholds.viralImpactRatio}x + ${thresholds.viralDeltaPct}%`,
      activeCount: 0,
    },
  ]

  alerts.forEach((alert) => {
    alert.signals.forEach((signal) => {
      const rule = catalog.find((item) => item.id === signal.type)
      if (rule) rule.activeCount += 1
    })
  })

  return catalog
}
