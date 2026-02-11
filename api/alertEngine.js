const defaultAlertThresholds = {
  minVolume: 40,
  volumeSpikePct: 30,
  volumeZScore: 2,
  negativityPct: 35,
  riskScore: 45,
  viralImpactRatio: 1.3,
  viralDeltaPct: 20,
  sentimentShiftPct: 10,
  topicNoveltyPct: 60,
  crossPlatformDeltaPct: 25,
  crossPlatformMinPlatforms: 2,
  coordinationRatio: 18,
  geoSpreadDeltaPct: 25,
}

const scopeSpecs = [
  { scopeType: 'cluster', key: (post) => post.cluster },
  { scopeType: 'subcluster', key: (post) => post.subcluster },
  { scopeType: 'microcluster', key: (post) => post.microcluster },
  { scopeType: 'city', key: (post) => post.location?.city },
  { scopeType: 'platform', key: (post) => post.platform },
]

const pctChange = (current, prev) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const dayKey = (date) => date.toISOString().slice(0, 10)

const calcRiskScore = (posts) => {
  const reachTotal = posts.reduce((acc, post) => acc + post.reach, 0)
  if (!reachTotal) return 0
  let positiveReach = 0
  let neutralReach = 0
  let negativeReach = 0
  posts.forEach((post) => {
    const weight = post.reach > 0 ? post.reach : 1
    if (post.sentiment === 'positivo') positiveReach += weight
    if (post.sentiment === 'neutral') neutralReach += weight
    if (post.sentiment === 'negativo') negativeReach += weight
  })
  const riskRaw = (negativeReach * 1.2 + neutralReach * 0.5 - positiveReach * 0.3) / reachTotal
  return Math.min(100, Math.max(0, riskRaw * 100))
}

const buildTopTopics = (posts, limit = 3) => {
  const topicCount = new Map()
  posts.forEach((post) => {
    topicCount.set(post.topic, (topicCount.get(post.topic) ?? 0) + 1)
  })
  return Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

const buildTopEntities = (posts, limit = 4) => {
  const entityCount = new Map()
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

const extractTokens = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !keywordStopwords.has(token))

const buildKeywords = (posts, limit = 6) => {
  const keywordCount = new Map()
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

const calcMedian = (values) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

const calcMeanStd = (values) => {
  if (!values.length) return { mean: 0, std: 0 }
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length
  const variance =
    values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    Math.max(1, values.length - 1)
  return { mean, std: Math.sqrt(variance) }
}

const buildDailyCounts = (posts) => {
  const buckets = new Map()
  posts.forEach((post) => {
    const key = dayKey(new Date(post.timestamp))
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  })
  return Array.from(buckets.values())
}

const resolveMinVolume = (baseMin, baselineDaily, currentTotal) => {
  const median = calcMedian(baselineDaily)
  const dynamicFromTotal = Math.round(currentTotal * 0.01)
  const dynamicFromMedian = median ? Math.round(median * 1.2) : 0
  return Math.max(baseMin, dynamicFromTotal, dynamicFromMedian, 3)
}

const calcImpactScore = (posts) => {
  if (!posts.length) return 0
  const reachValues = posts.map((post) => post.reach).filter((value) => value > 0)
  const engagementValues = posts.map((post) => post.engagement).filter((value) => value > 0)
  const medianReach = calcMedian(reachValues)
  const medianEngagement = calcMedian(engagementValues)
  return medianReach * 0.6 + medianEngagement * 0.4
}

const buildStats = (posts, baselinePosts = []) => {
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
    posts.map((post) => post.location?.city).filter((value) => value)
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

const severityWeight = (severity) => {
  if (severity === 'critical') return 4
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  return 1
}

const calcPriority = (severity, riskScore) => {
  const base = severityWeight(severity) * 20
  const riskBoost = Math.min(40, riskScore * 0.6)
  return Math.round(Math.min(100, base + riskBoost))
}

const calcCompositeScore = (stats, prevStats, impactRatio, volumeZScore) => {
  const deltaPct = Math.abs(pctChange(stats.total, prevStats.total))
  const volumeScore = Math.min(100, deltaPct)
  const riskScore = Math.min(100, stats.riskScore)
  const negativeScore = Math.min(100, stats.negativeShare)
  const impactScore = Math.min(100, Math.max(0, (impactRatio - 1) * 100))
  const zScore = Math.min(100, Math.max(0, volumeZScore * 20))
  return (
    volumeScore * 0.25 +
    riskScore * 0.25 +
    negativeScore * 0.2 +
    impactScore * 0.2 +
    zScore * 0.1
  )
}

const resolveCompositeSeverity = (score) => {
  if (score >= 85) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 55) return 'medium'
  return 'low'
}

const calcConfidence = (stats, prevStats, signals, thresholds) => {
  const volumeScore = Math.min(1, stats.total / Math.max(1, thresholds.minVolume * 2))
  const signalScore = Math.min(1, signals.length / 3)
  const delta = Math.abs(stats.total - prevStats.total)
  const stabilityScore = stats.total
    ? 1 - Math.min(1, delta / Math.max(stats.total, prevStats.total || 1))
    : 0
  const raw = volumeScore * 0.45 + signalScore * 0.35 + stabilityScore * 0.2
  return Math.round(raw * 100)
}

const hashString = (value) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const buildStableId = (value) => `al_${hashString(value)}`

const buildInstanceId = (value) => `ai_${hashString(value)}`

const resolveSignalSeverity = (signal, impactRatio) => {
  if (signal.type === 'volume') {
    if (signal.value >= 60) return 'critical'
    if (signal.value >= 45) return 'high'
    if (signal.value >= 30) return 'medium'
    return 'low'
  }
  if (signal.type === 'sentiment_shift') {
    if (signal.value >= 25) return 'critical'
    if (signal.value >= 18) return 'high'
    if (signal.value >= 10) return 'medium'
    return 'low'
  }
  if (signal.type === 'topic_novelty') {
    if (signal.value >= 80) return 'critical'
    if (signal.value >= 65) return 'high'
    if (signal.value >= 50) return 'medium'
    return 'low'
  }
  if (signal.type === 'cross_platform') {
    if (signal.value >= 4) return 'critical'
    if (signal.value >= 3) return 'high'
    if (signal.value >= 2) return 'medium'
    return 'low'
  }
  if (signal.type === 'coordination') {
    if (signal.value >= 35) return 'critical'
    if (signal.value >= 25) return 'high'
    if (signal.value >= 18) return 'medium'
    return 'low'
  }
  if (signal.type === 'geo_expansion') {
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

const pickPrimarySignal = (signals, impactRatio) => {
  const sorted = [...signals].sort((a, b) => {
    const sa = resolveSignalSeverity(a, impactRatio)
    const sb = resolveSignalSeverity(b, impactRatio)
    return severityWeight(sb) - severityWeight(sa)
  })
  return sorted[0]
}

const compactFormatter = new Intl.NumberFormat('es-PR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatCompact = (value) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '0'

const formatSignedCompact = (value) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  const sign = value > 0 ? '+' : '-'
  return `${sign}${formatCompact(Math.abs(value))}`
}

const buildSummary = (stats, prevStats) => {
  const deltaAbs = (stats?.total ?? 0) - (prevStats?.total ?? 0)
  return `Vol ${formatCompact(stats.total)} · Δ ${formatSignedCompact(deltaAbs)} · Neg ${stats.negativeShare.toFixed(0)}% · Riesgo ${stats.riskScore.toFixed(0)}`
}

const buildEvidence = (posts) => {
  const scored = posts
    .map((post) => {
      const sentimentBoost =
        post.sentiment === 'negativo' ? 1.2 : post.sentiment === 'neutral' ? 1 : 0.9
      return {
        post,
        score: (post.reach * 0.6 + post.engagement * 0.4) * sentimentBoost,
      }
    })
    .sort((a, b) => b.score - a.score)

  const picked = []
  const seenAuthors = new Set()
  for (const item of scored) {
    const authorKey = (item.post.handle || item.post.author || '').toLowerCase()
    if (authorKey && seenAuthors.has(authorKey)) continue
    if (authorKey) seenAuthors.add(authorKey)
    picked.push(item.post)
    if (picked.length >= 5) break
  }
  return picked
}

const groupBy = (posts, getKey) => {
  const groups = new Map()
  posts.forEach((post) => {
    const key = getKey(post)
    if (!key) return
    groups.set(key, [...(groups.get(key) ?? []), post])
  })
  return groups
}

const buildSignals = (stats, prevStats, impactRatio, thresholds, context = {}) => {
  const deltaPct = pctChange(stats.total, prevStats.total)
  const signals = []
  const ruleValues = {}
  const baselineDaily = context.baselineDaily ?? []
  const { mean: baselineMean, std: baselineStd } = calcMeanStd(baselineDaily)
  const volumeZScore = baselineStd > 0 ? (stats.total - baselineMean) / baselineStd : 0

  if (
    stats.total >= thresholds.minVolume &&
    (deltaPct >= thresholds.volumeSpikePct || volumeZScore >= thresholds.volumeZScore)
  ) {
    signals.push({
      type: 'volume',
      label: 'Volumen en alza',
      value: Math.max(deltaPct, volumeZScore * 10),
      deltaPct,
    })
    ruleValues.volume = {
      value: deltaPct,
      threshold: thresholds.volumeSpikePct,
      deltaPct,
      zScore: volumeZScore,
      zThreshold: thresholds.volumeZScore,
      minVolume: thresholds.minVolume,
    }
  }

  const sentimentShift = stats.negativeShare - prevStats.negativeShare
  if (stats.total >= thresholds.minVolume && sentimentShift >= thresholds.sentimentShiftPct) {
    signals.push({
      type: 'sentiment_shift',
      label: 'Cambio de negatividad',
      value: sentimentShift,
    })
    ruleValues.sentiment_shift = {
      value: sentimentShift,
      threshold: thresholds.sentimentShiftPct,
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

  const baselineTopics = prevStats.topTopics.map((topic) => topic.name)
  const currentTopics = stats.topTopics.map((topic) => topic.name)
  const noveltyCount = currentTopics.filter((topic) => !baselineTopics.includes(topic))
  const noveltyPct = currentTopics.length
    ? (noveltyCount.length / currentTopics.length) * 100
    : 0
  if (stats.total >= thresholds.minVolume && noveltyPct >= thresholds.topicNoveltyPct) {
    signals.push({
      type: 'topic_novelty',
      label: 'Temas nuevos emergentes',
      value: noveltyPct,
    })
    ruleValues.topic_novelty = {
      value: noveltyPct,
      threshold: thresholds.topicNoveltyPct,
    }
  }

  if (context.currentPosts?.length) {
    const platformCounts = new Map()
    const prevPlatformCounts = new Map()
    context.currentPosts.forEach((post) => {
      platformCounts.set(post.platform, (platformCounts.get(post.platform) ?? 0) + 1)
    })
    context.prevPosts.forEach((post) => {
      prevPlatformCounts.set(post.platform, (prevPlatformCounts.get(post.platform) ?? 0) + 1)
    })
    const minPlatformVolume = Math.max(3, Math.round(thresholds.minVolume * 0.25))
    let platformsAbove = 0
    platformCounts.forEach((count, platform) => {
      const prevCount = prevPlatformCounts.get(platform) ?? 0
      const platformDelta = pctChange(count, prevCount)
      if (count >= minPlatformVolume && platformDelta >= thresholds.crossPlatformDeltaPct) {
        platformsAbove += 1
      }
    })
    if (platformsAbove >= thresholds.crossPlatformMinPlatforms) {
      signals.push({
        type: 'cross_platform',
        label: 'Spike multi-plataforma',
        value: platformsAbove,
      })
      ruleValues.cross_platform = {
        value: platformsAbove,
        threshold: thresholds.crossPlatformMinPlatforms,
      }
    }

    const contentMap = new Map()
    const urlPattern = /https?:\/\/\S+/g
    context.currentPosts.forEach((post) => {
      const contentKey = post.content.toLowerCase().replace(urlPattern, '').slice(0, 160)
      const authorKey = (post.handle || post.author || '').toLowerCase()
      if (!contentKey || !authorKey) return
      const entry = contentMap.get(contentKey) ?? { authors: new Set(), count: 0 }
      entry.authors.add(authorKey)
      entry.count += 1
      contentMap.set(contentKey, entry)
    })
    let coordinatedPosts = 0
    contentMap.forEach((entry) => {
      if (entry.authors.size >= 2) {
        coordinatedPosts += entry.count
      }
    })
    const coordinationRatio = stats.total
      ? Math.min(100, (coordinatedPosts / stats.total) * 100)
      : 0
    if (coordinationRatio >= thresholds.coordinationRatio) {
      signals.push({
        type: 'coordination',
        label: 'Coordinación detectada',
        value: coordinationRatio,
      })
      ruleValues.coordination = {
        value: coordinationRatio,
        threshold: thresholds.coordinationRatio,
      }
    }
  }

  const geoSpreadDeltaPct = pctChange(stats.geoSpread ?? 0, prevStats.geoSpread ?? 0)
  if (stats.total >= thresholds.minVolume && geoSpreadDeltaPct >= thresholds.geoSpreadDeltaPct) {
    signals.push({
      type: 'geo_expansion',
      label: 'Expansión geográfica',
      value: geoSpreadDeltaPct,
    })
    ruleValues.geo_expansion = {
      value: geoSpreadDeltaPct,
      threshold: thresholds.geoSpreadDeltaPct,
    }
  }

  return { signals, deltaPct, ruleValues, volumeZScore }
}

const lifecycleSlaTargets = {
  critical: 2,
  high: 6,
  medium: 12,
  low: 24,
}

const deterministicHash = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const resolveStartMs = (alert) => {
  const candidates = [alert.firstSeenAt, alert.createdAt, alert.lastSeenAt]
  for (const candidate of candidates) {
    if (!candidate) continue
    const ts = new Date(candidate).getTime()
    if (Number.isFinite(ts)) return ts
  }
  return Date.now()
}

const buildLifecycleState = (alert, status, nowMs, ageHours, hash) => {
  const startMs = resolveStartMs(alert)
  const ageMs = Math.max(30 * 60 * 1000, ageHours * 60 * 60 * 1000)
  const ackRatio = Math.min(0.82, 0.24 + (hash % 6) * 0.07)
  const resolveRatio = Math.min(0.96, 0.58 + (hash % 5) * 0.08)
  const ackMs = Math.min(
    nowMs,
    Math.max(startMs + 5 * 60 * 1000, Math.round(startMs + ageMs * ackRatio))
  )
  const resolvedMs = Math.min(
    nowMs,
    Math.max(ackMs + 5 * 60 * 1000, Math.round(startMs + ageMs * resolveRatio))
  )
  const statusShiftMs = Math.min(
    nowMs,
    Math.max(startMs, Math.round(startMs + ageMs * (0.12 + (hash % 5) * 0.04)))
  )
  const snoozeUntil = new Date(nowMs + ((hash % 4) + 2) * 60 * 60 * 1000).toISOString()
  const occurrences = hash % 11 === 0 ? 2 : hash % 23 === 0 ? 3 : alert.occurrences ?? 1

  if (status === 'open') {
    return {
      status,
      lastStatusAt: new Date(statusShiftMs).toISOString(),
      ackAt: null,
      resolvedAt: null,
      snoozeUntil: null,
      occurrences,
      activeWindowCount: Math.max(alert.activeWindowCount ?? 1, occurrences),
    }
  }

  if (status === 'ack') {
    return {
      status,
      lastStatusAt: new Date(ackMs).toISOString(),
      ackAt: new Date(ackMs).toISOString(),
      resolvedAt: null,
      snoozeUntil: null,
      occurrences,
      activeWindowCount: Math.max(alert.activeWindowCount ?? 1, occurrences),
    }
  }

  if (status === 'escalated') {
    const escalatedMs = Math.min(nowMs, ackMs + ((hash % 3) + 1) * 45 * 60 * 1000)
    return {
      status,
      lastStatusAt: new Date(escalatedMs).toISOString(),
      ackAt: new Date(ackMs).toISOString(),
      resolvedAt: null,
      snoozeUntil: null,
      occurrences: Math.max(occurrences, 2),
      activeWindowCount: Math.max(alert.activeWindowCount ?? 1, 2),
    }
  }

  if (status === 'snoozed') {
    const snoozedAt = Math.min(nowMs, Math.max(ackMs, nowMs - ((hash % 4) + 1) * 20 * 60 * 1000))
    return {
      status,
      lastStatusAt: new Date(snoozedAt).toISOString(),
      ackAt: new Date(ackMs).toISOString(),
      resolvedAt: null,
      snoozeUntil,
      occurrences,
      activeWindowCount: Math.max(alert.activeWindowCount ?? 1, occurrences),
    }
  }

  return {
    status: 'resolved',
    lastStatusAt: new Date(resolvedMs).toISOString(),
    ackAt: new Date(ackMs).toISOString(),
    resolvedAt: new Date(resolvedMs).toISOString(),
    snoozeUntil: null,
    occurrences: Math.max(occurrences, 2),
    activeWindowCount: Math.max(alert.activeWindowCount ?? 1, 2),
  }
}

const applyLifecycleSimulation = (alerts) => {
  if (!alerts.length) return alerts
  const nowMs = Date.now()

  const toStatus = (entry, status) => ({
    ...entry,
    alert: {
      ...entry.alert,
      ...buildLifecycleState(entry.alert, status, nowMs, entry.ageHours, entry.hash),
    },
  })

  let entries = alerts.map((alert, index) => {
    const startMs = resolveStartMs(alert)
    const ageHours = Math.max(0, (nowMs - startMs) / (1000 * 60 * 60))
    const target = lifecycleSlaTargets[alert.severity]
    const breached = ageHours > target
    const hash = deterministicHash(
      `${alert.id}:${alert.scopeType}:${alert.scopeId}:${Math.round(alert.metrics.volumeCurrent)}`
    )
    const rankRatio = (index + 1) / Math.max(1, alerts.length)

    let status = 'open'
    if (breached && (alert.severity === 'critical' || alert.severity === 'high')) {
      status = hash % 100 < 62 ? 'escalated' : 'ack'
    } else if (breached && rankRatio > 0.35) {
      status = hash % 100 < 58 ? 'ack' : 'open'
    } else if (rankRatio > 0.75 && alert.severity !== 'critical' && hash % 100 < 58) {
      status = 'resolved'
    } else if (rankRatio > 0.55 && alert.severity !== 'critical' && hash % 100 < 30) {
      status = 'snoozed'
    } else if (rankRatio > 0.35 && hash % 100 < 48) {
      status = 'ack'
    }

    return toStatus({ alert, ageHours, hash, breached }, status)
  })

  const countStatus = (status) =>
    entries.filter((entry) => entry.alert.status === status).length

  const ensureStatus = (status, minAlerts, pickIndex) => {
    if (entries.length < minAlerts || countStatus(status) > 0) return
    const index = pickIndex(entries)
    if (index < 0) return
    entries = entries.map((entry, current) =>
      current === index ? toStatus(entry, status) : entry
    )
  }

  ensureStatus('ack', 2, (list) =>
    list.findIndex((entry) => entry.alert.status === 'open')
  )
  ensureStatus('escalated', 4, (list) => {
    const prioritized = list.findIndex(
      (entry) =>
        (entry.alert.severity === 'critical' || entry.alert.severity === 'high') &&
        entry.alert.status !== 'resolved'
    )
    if (prioritized >= 0) return prioritized
    const breached = list.findIndex(
      (entry) => entry.breached && entry.alert.status !== 'resolved'
    )
    if (breached >= 0) return breached
    return list.findIndex((entry) => entry.alert.status === 'open')
  })
  ensureStatus('resolved', 5, (list) => {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const entry = list[index]
      if (
        entry.alert.severity !== 'critical' &&
        entry.alert.status !== 'escalated' &&
        entry.alert.status !== 'resolved'
      ) {
        return index
      }
    }
    return -1
  })
  ensureStatus('snoozed', 6, (list) =>
    list.findIndex(
      (entry) =>
        (entry.alert.severity === 'medium' || entry.alert.severity === 'low') &&
        entry.alert.status === 'open'
    )
  )

  return entries.map((entry) => entry.alert)
}

export const buildAlerts = (currentPosts, prevPosts, thresholds = {}) => {
  const baselineImpact = calcImpactScore(currentPosts)
  const config = {
    ...defaultAlertThresholds,
    ...thresholds,
    minVolume: Math.max(
      thresholds.minVolume ?? defaultAlertThresholds.minVolume,
      Math.round(currentPosts.length * 0.01)
    ),
  }

  const alerts = []

  const overallStats = buildStats(currentPosts, prevPosts)
  const overallPrev = buildStats(prevPosts)
  const overallImpactRatio = baselineImpact ? overallStats.impactScore / baselineImpact : 0
  const overallBaselineDaily = buildDailyCounts(prevPosts)
  const overallConfig = {
    ...config,
    minVolume: resolveMinVolume(config.minVolume, overallBaselineDaily, overallStats.total),
  }
  const overallSignals = buildSignals(overallStats, overallPrev, overallImpactRatio, overallConfig, {
    currentPosts,
    prevPosts,
    baselineDaily: overallBaselineDaily,
  })
  if (overallSignals.signals.length) {
    const primary = pickPrimarySignal(overallSignals.signals, overallImpactRatio)
    const compositeScore = calcCompositeScore(
      overallStats,
      overallPrev,
      overallImpactRatio,
      overallSignals.volumeZScore ?? 0
    )
    const severity = resolveCompositeSeverity(compositeScore)
    const score = compositeScore + Math.min(20, overallSignals.signals.length * 5)
    const nowIso = new Date().toISOString()
    const stableId = buildStableId('overall:overall')
    const instanceBucket = dayKey(new Date(overallStats.latestTs || Date.now()))
    const instanceId = buildInstanceId(
      `overall:overall:${primary.type}:${instanceBucket}`
    )
    const confidence = calcConfidence(
      overallStats,
      overallPrev,
      overallSignals.signals,
      overallConfig
    )
    const priority = calcPriority(severity, overallStats.riskScore)
    const firstSeenAt = new Date(overallStats.earliestTs || Date.now()).toISOString()
    const lastSeenAt = new Date(overallStats.latestTs || Date.now()).toISOString()

    alerts.push({
      id: 'overall',
      stableId,
      instanceId,
      title: `Panorama general · ${primary.label}`,
      summary: buildSummary(overallStats, overallPrev),
      severity,
      status: 'open',
      priority,
      scopeType: 'overall',
      scopeId: 'overall',
      scopeLabel: 'Panorama general',
      createdAt: firstSeenAt,
      firstSeenAt,
      lastSeenAt,
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
      ruleValues: overallSignals.ruleValues,
      topTopics: overallStats.topTopics,
      topEntities: overallStats.topEntities,
      keywords: overallStats.keywords,
      uniqueAuthors: overallStats.uniqueAuthors,
      newAuthorsPct: overallStats.newAuthorsPct,
      geoSpread: overallStats.geoSpread,
      evidence: buildEvidence(currentPosts),
      primarySignal: primary.type,
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
      const baselineDaily = buildDailyCounts(prevGroupPosts)
      const localConfig = {
        ...config,
        minVolume: resolveMinVolume(config.minVolume, baselineDaily, stats.total),
      }
      const { signals, deltaPct, ruleValues, volumeZScore } = buildSignals(
        stats,
        prevStats,
        impactRatio,
        localConfig,
        {
          currentPosts: groupPosts,
          prevPosts: prevGroupPosts,
          baselineDaily,
        }
      )
      if (!signals.length) return

      const primary = pickPrimarySignal(signals, impactRatio)
      const compositeScore = calcCompositeScore(
        stats,
        prevStats,
        impactRatio,
        volumeZScore ?? 0
      )
      const severity = resolveCompositeSeverity(compositeScore)
      const score = compositeScore + Math.min(20, signals.length * 5)

      const nowIso = new Date().toISOString()
      const stableId = buildStableId(`${scope.scopeType}:${scopeId}`)
      const instanceBucket = dayKey(new Date(stats.latestTs || Date.now()))
      const instanceId = buildInstanceId(
        `${scope.scopeType}:${scopeId}:${primary.type}:${instanceBucket}`
      )
      const confidence = calcConfidence(stats, prevStats, signals, localConfig)
      const priority = calcPriority(severity, stats.riskScore)
      const firstSeenAt = new Date(stats.earliestTs || Date.now()).toISOString()
      const lastSeenAt = new Date(stats.latestTs || Date.now()).toISOString()

      const parentScopeId =
        scope.scopeType === 'subcluster'
          ? groupPosts[0]?.cluster
          : scope.scopeType === 'microcluster'
            ? groupPosts[0]?.subcluster
            : undefined
      const parentScopeType =
        scope.scopeType === 'subcluster'
          ? 'cluster'
          : scope.scopeType === 'microcluster'
            ? 'subcluster'
            : undefined

      alerts.push({
        id: `${scope.scopeType}:${scopeId}`,
        stableId,
        instanceId,
        title: `${scopeId} · ${primary.label}`,
        summary: buildSummary(stats, prevStats),
        severity,
        status: 'open',
        priority,
        scopeType: scope.scopeType,
        scopeId,
        scopeLabel: scopeId,
        createdAt: firstSeenAt,
        firstSeenAt,
        lastSeenAt,
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
        ruleValues,
        topTopics: stats.topTopics,
        topEntities: stats.topEntities,
        keywords: stats.keywords,
        uniqueAuthors: stats.uniqueAuthors,
        newAuthorsPct: stats.newAuthorsPct,
        geoSpread: stats.geoSpread,
        evidence: buildEvidence(groupPosts),
        parentScopeId,
        parentScopeType,
        primarySignal: primary.type,
        score,
      })
    })
  })

  const parentLookup = new Map()
  alerts.forEach((alert) => {
    parentLookup.set(`${alert.scopeType}:${alert.scopeId}`, alert)
  })
  const deduped = alerts.filter((alert) => {
    if (!alert.parentScopeId || !alert.parentScopeType) return true
    const parent = parentLookup.get(`${alert.parentScopeType}:${alert.parentScopeId}`)
    if (!parent) return true
    if (parent.primarySignal && parent.primarySignal === alert.primarySignal) {
      return parent.score < alert.score * 0.85
    }
    return true
  })

  const ranked = deduped
    .sort((a, b) => b.score - a.score)
    .slice(0, 32)
  const withLifecycle = applyLifecycleSimulation(ranked)

  return withLifecycle
    .map(({ score, parentScopeId, parentScopeType, primarySignal, ...alert }) => alert)
}

export const buildAlertRuleStats = (alerts, thresholds) => {
  const catalog = [
    {
      id: 'volume',
      label: 'Spike de volumen',
      threshold: `≥ ${thresholds.volumeSpikePct}% o z≥${thresholds.volumeZScore}`,
      activeCount: 0,
    },
    {
      id: 'sentiment_shift',
      label: 'Cambio de negatividad',
      threshold: `≥ ${thresholds.sentimentShiftPct}%`,
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
    {
      id: 'topic_novelty',
      label: 'Temas nuevos',
      threshold: `≥ ${thresholds.topicNoveltyPct}%`,
      activeCount: 0,
    },
    {
      id: 'cross_platform',
      label: 'Spike multi-plataforma',
      threshold: `≥ ${thresholds.crossPlatformMinPlatforms} plataformas`,
      activeCount: 0,
    },
    {
      id: 'coordination',
      label: 'Coordinación',
      threshold: `≥ ${thresholds.coordinationRatio}%`,
      activeCount: 0,
    },
    {
      id: 'geo_expansion',
      label: 'Expansión geográfica',
      threshold: `≥ ${thresholds.geoSpreadDeltaPct}%`,
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

export { defaultAlertThresholds }
