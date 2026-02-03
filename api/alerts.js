import { query } from './db.js'
import {
  buildAlerts,
  buildAlertRuleStats,
  defaultAlertThresholds,
} from './alertEngine.js'
import {
  buildAlertTimeline,
  buildBaselineStats,
  buildPulseStats,
  buildWindow,
  filterPosts,
  formatRange,
  mapRows,
  parseCount,
  parseCursor,
  parseLimit,
  parseList,
  parseSingle,
  severityWeight,
} from './alerts/shared.js'

const allowCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

const sortAlerts = (alerts, sortKey) => {
  if (!sortKey || sortKey === 'score') return alerts
  const sorted = [...alerts]
  if (sortKey === 'severity') {
    return sorted.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))
  }
  if (sortKey === 'priority') {
    return sorted.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }
  if (sortKey === 'recent') {
    return sorted.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt))
  }
  if (sortKey === 'volume') {
    return sorted.sort((a, b) => b.metrics.volumeCurrent - a.metrics.volumeCurrent)
  }
  if (sortKey === 'risk') {
    return sorted.sort((a, b) => b.metrics.riskScore - a.metrics.riskScore)
  }
  if (sortKey === 'impact') {
    return sorted.sort((a, b) => b.metrics.impactRatio - a.metrics.impactRatio)
  }
  return alerts
}

const mergePersistedState = async (alerts) => {
  if (!alerts.length) return alerts
  try {
    const ids = alerts.map((alert) => alert.id)
    const sql = `
      select
        id,
        status,
        ack_at as "ackAt",
        resolved_at as "resolvedAt",
        snooze_until as "snoozeUntil",
        last_status_at as "lastStatusAt",
        owner,
        team,
        assignee,
        priority,
        severity
      from alerts
      where id = any($1)
    `
    const result = await query(sql, [ids])
    const map = new Map(result.rows.map((row) => [row.id, row]))
    return alerts.map((alert) => {
      const persisted = map.get(alert.id)
      if (!persisted) return alert
      return {
        ...alert,
        status: persisted.status ?? alert.status,
        ackAt: persisted.ackAt ?? alert.ackAt,
        resolvedAt: persisted.resolvedAt ?? alert.resolvedAt,
        snoozeUntil: persisted.snoozeUntil ?? alert.snoozeUntil,
        lastStatusAt: persisted.lastStatusAt ?? alert.lastStatusAt,
        owner: persisted.owner ?? alert.owner,
        team: persisted.team ?? alert.team,
        assignee: persisted.assignee ?? alert.assignee,
        priority: Number.isFinite(persisted.priority) ? persisted.priority : alert.priority,
        severity: persisted.severity ?? alert.severity,
      }
    })
  } catch (error) {
    console.warn('Alert state merge failed:', error)
    return alerts
  }
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const count = parseCount(req.query?.count)
  const limit = parseLimit(req.query?.limit)
  const cursor = parseCursor(req.query?.cursor)
  const sort = parseSingle(req.query?.sort) ?? 'score'
  const severityFilter = parseList(req.query?.severity)
  const statusFilter = parseList(req.query?.status)
  const sql = `
    select
      p.id,
      p.author,
      p.handle,
      coalesce(pl.display_name, p.platform_id) as platform,
      p.content,
      p.sentiment,
      coalesce(t.display_name, p.topic_id) as topic,
      p.timestamp,
      p.reach,
      p.engagement,
      p.media_type as "mediaType",
      coalesce(c.display_name, p.cluster_id) as cluster,
      coalesce(sc.display_name, p.subcluster_id) as subcluster,
      coalesce(mc.display_name, p.microcluster_id) as microcluster,
      l.city,
      l.lat,
      l.lng
    from posts p
    left join platforms pl on pl.id = p.platform_id
    left join topics t on t.id = p.topic_id
    left join clusters c on c.id = p.cluster_id
    left join subclusters sc on sc.id = p.subcluster_id
    left join microclusters mc on mc.id = p.microcluster_id
    left join locations l on l.id = p.location_id
    order by p.timestamp desc
    limit $1
  `

  try {
    const result = await query(sql, [count])
    const posts = mapRows(result.rows)
    const filters = {
      sentiment: parseSingle(req.query?.sentiment),
      platform: parseSingle(req.query?.platform),
      cluster: parseSingle(req.query?.cluster),
      subcluster: parseSingle(req.query?.subcluster),
      timeframe: parseSingle(req.query?.timeframe) ?? 'todo',
      dateFrom: parseSingle(req.query?.dateFrom),
      dateTo: parseSingle(req.query?.dateTo),
    }
    const search = parseSingle(req.query?.search) ?? ''

    const matching = filterPosts(posts, filters, search)
    const {
      currentPosts,
      prevPosts,
      prevPrevPosts,
      windowStart,
      windowEnd,
      prevWindowStart,
      prevWindowEnd,
      baselineStart,
      baselineEnd,
    } = buildWindow(matching, filters)

    let alerts = buildAlerts(currentPosts, prevPosts)
    const prevAlerts = buildAlerts(prevPosts, prevPrevPosts)

    alerts = await mergePersistedState(alerts)

    const applyFilters = (list) =>
      list.filter((alert) => {
        if (severityFilter.length && !severityFilter.includes(alert.severity)) return false
        if (statusFilter.length && !statusFilter.includes(alert.status)) return false
        return true
      })

    const filteredAlerts = applyFilters(alerts)
    const filteredPrevAlerts = applyFilters(prevAlerts)

    const rangeLabel = formatRange(windowStart, windowEnd)
    const pulseStats = buildPulseStats(
      filteredAlerts,
      filteredPrevAlerts,
      rangeLabel,
      windowEnd,
      prevWindowEnd
    )
    const baselineStats = buildBaselineStats(filteredPrevAlerts, prevWindowEnd)
    const timeline = buildAlertTimeline(filteredAlerts, windowStart, windowEnd)
    const rules = buildAlertRuleStats(filteredAlerts, defaultAlertThresholds)

    const sortedAlerts = sortAlerts(filteredAlerts, sort)
    const pagedAlerts = sortedAlerts.slice(cursor, cursor + limit)
    const nextCursor = cursor + limit < sortedAlerts.length ? String(cursor + limit) : null

    res.status(200).json({
      alerts: pagedAlerts,
      total: filteredAlerts.length,
      nextCursor,
      pulseStats,
      baselineStats,
      timeline,
      rules,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
      prevWindow: { start: prevWindowStart.toISOString(), end: prevWindowEnd.toISOString() },
      baseline: { start: baselineStart.toISOString(), end: baselineEnd.toISOString() },
    })
  } catch (error) {
    console.error('DB error:', error)
    res.status(500).json({ error: 'Database query failed' })
  }
}
