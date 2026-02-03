export const timeframeHours = {
  '24h': 24,
  '72h': 72,
  '7d': 24 * 7,
  '1m': 24 * 30,
  todo: 0,
}

export const parseSingle = (value) => {
  if (Array.isArray(value)) return value[0]
  return value
}

export const parseList = (value) => {
  const single = parseSingle(value)
  if (!single) return []
  return single
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export const parseCount = (value) => {
  const parsed = Number.parseInt(parseSingle(value) ?? '7000', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 7000
  return Math.min(parsed, 10000)
}

export const parseLimit = (value) => {
  const parsed = Number.parseInt(parseSingle(value) ?? '32', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 32
  return Math.min(parsed, 200)
}

export const parseCursor = (value) => {
  const raw = parseSingle(value)
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export const formatRange = (start, end) =>
  `${start.toLocaleDateString('es-PR', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString(
    'es-PR',
    { month: 'short', day: 'numeric' }
  )}`

export const mapRows = (rows) =>
  rows.map((row) => ({
    id: row.id,
    author: row.author,
    handle: row.handle,
    platform: row.platform,
    content: row.content,
    sentiment: row.sentiment,
    topic: row.topic,
    timestamp: row.timestamp,
    reach: row.reach,
    engagement: row.engagement,
    mediaType: row.mediaType,
    cluster: row.cluster,
    subcluster: row.subcluster,
    microcluster: row.microcluster,
    location: {
      city: row.city,
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
  }))

export const filterPosts = (posts, filters, search) =>
  posts.filter((post) => {
    if (filters.sentiment && filters.sentiment !== 'todos' && post.sentiment !== filters.sentiment) {
      return false
    }
    if (filters.platform && filters.platform !== 'todos' && post.platform !== filters.platform) {
      return false
    }
    if (filters.cluster && filters.cluster !== 'todos' && post.cluster !== filters.cluster) {
      return false
    }
    if (filters.subcluster && filters.subcluster !== 'todos' && post.subcluster !== filters.subcluster) {
      return false
    }
    if (search) {
      const q = search.toLowerCase()
      const haystack = `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic} ${post.cluster} ${post.subcluster} ${post.microcluster}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

export const buildWindow = (posts, filters) => {
  if (!posts.length) {
    const now = new Date()
    return {
      currentPosts: [],
      prevPosts: [],
      prevPrevPosts: [],
      windowStart: now,
      windowEnd: now,
      prevWindowStart: now,
      prevWindowEnd: now,
      baselineStart: now,
      baselineEnd: now,
    }
  }

  const timestamps = posts.map((post) => new Date(post.timestamp).getTime())
  const maxTs = Math.max(...timestamps)
  const minTs = Math.min(...timestamps)

  let start = new Date(minTs)
  let end = new Date(maxTs)

  if (filters.dateFrom || filters.dateTo) {
    start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(minTs)
    end = filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : new Date(maxTs)
  } else if (filters.timeframe && filters.timeframe !== 'todo') {
    end = new Date(maxTs)
    start = new Date(end.getTime() - timeframeHours[filters.timeframe] * 60 * 60 * 1000)
  }

  const windowMs = Math.max(1, end.getTime() - start.getTime())
  const prevStart = new Date(start.getTime() - windowMs)
  const prevEnd = new Date(start.getTime())
  const prevPrevStart = new Date(prevStart.getTime() - windowMs)
  const prevPrevEnd = new Date(prevStart.getTime())

  const inRange = (post, rangeStart, rangeEnd) => {
    const ts = new Date(post.timestamp).getTime()
    return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime()
  }

  return {
    currentPosts: posts.filter((post) => inRange(post, start, end)),
    prevPosts: posts.filter((post) => inRange(post, prevStart, prevEnd)),
    prevPrevPosts: posts.filter((post) => inRange(post, prevPrevStart, prevPrevEnd)),
    windowStart: start,
    windowEnd: end,
    prevWindowStart: prevStart,
    prevWindowEnd: prevEnd,
    baselineStart: prevPrevStart,
    baselineEnd: prevPrevEnd,
  }
}

const dayKey = (date) => date.toISOString().slice(0, 10)

export const buildAlertTimeline = (alerts, start, end) => {
  const points = new Map()
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

const pctChange = (current, prev) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

export const calcSlaHours = (alerts, referenceTime) => {
  if (!alerts.length) return 0
  const totalHours = alerts.reduce((acc, alert) => {
    const createdAt = new Date(alert.createdAt).getTime()
    const diff = Math.max(0, referenceTime - createdAt)
    return acc + diff / (1000 * 60 * 60)
  }, 0)
  return totalHours / Math.max(1, alerts.length)
}

export const buildPulseStats = (alerts, prevAlerts, rangeLabel, windowEnd, prevWindowEnd) => {
  const openAlerts = alerts.filter((alert) => alert.status === 'open')
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical')
  const investigatingAlerts = alerts.filter(
    (alert) => alert.status === 'ack' || alert.status === 'escalated'
  )
  const slaHours = calcSlaHours(openAlerts, windowEnd.getTime())

  const prevOpen = prevAlerts.length
  const prevCritical = prevAlerts.filter((alert) => alert.severity === 'critical').length
  const prevInvestigating = prevAlerts.filter(
    (alert) => alert.status === 'ack' || alert.status === 'escalated'
  ).length
  const prevSla = calcSlaHours(prevAlerts, prevWindowEnd.getTime())

  return {
    openCount: openAlerts.length,
    criticalCount: criticalAlerts.length,
    investigatingCount: investigatingAlerts.length,
    slaHours,
    rangeLabel,
    deltas: {
      openPct: pctChange(openAlerts.length, prevOpen),
      criticalPct: pctChange(criticalAlerts.length, prevCritical),
      investigatingPct: pctChange(investigatingAlerts.length, prevInvestigating),
      slaPct: pctChange(slaHours, prevSla),
    },
  }
}

export const buildBaselineStats = (alerts, referenceTime) => {
  const openAlerts = alerts.filter((alert) => alert.status === 'open')
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical')
  const investigatingAlerts = alerts.filter(
    (alert) => alert.status === 'ack' || alert.status === 'escalated'
  )
  return {
    openCount: openAlerts.length,
    criticalCount: criticalAlerts.length,
    investigatingCount: investigatingAlerts.length,
    slaHours: calcSlaHours(openAlerts, referenceTime.getTime()),
  }
}

export const severityWeight = (severity) => {
  if (severity === 'critical') return 4
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  return 1
}
