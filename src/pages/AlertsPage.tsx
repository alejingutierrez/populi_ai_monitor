import { useEffect, useMemo, useState, type FC } from 'react'
import AlertIntel from '../components/AlertIntel'
import AlertTimeline from '../components/AlertTimeline'
import AlertsPulse from '../components/AlertsPulse'
import AlertsStream from '../components/AlertsStream'
import type { Filters } from '../components/FilterBar'
import {
  buildAlertRuleStats,
  buildAlerts,
  buildAlertTimeline,
  defaultAlertThresholds,
  formatRange,
  type Alert,
  type AlertRuleStat,
  type AlertStatus,
  type AlertTimelinePoint,
} from '../data/alerts'
import type { SocialPost } from '../types'

interface Props {
  posts: SocialPost[]
  filters: Filters
  search: string
  apiBase?: string
  onApplyAlertScope?: (alert: Alert) => void
  onOpenFeedStream?: (alert: Alert) => void
}

type AlertsPulseStats = {
  openCount: number
  criticalCount: number
  investigatingCount: number
  slaHours: number
  rangeLabel: string
  deltas: {
    openPct: number
    criticalPct: number
    investigatingPct: number
    slaPct: number
  }
}

type BaselineStats = {
  openCount: number
  criticalCount: number
  investigatingCount: number
  slaHours: number
}

type RemoteAlertsPayload = {
  alerts: Alert[]
  pulseStats?: AlertsPulseStats
  baselineStats?: BaselineStats
  timeline?: AlertTimelinePoint[]
  rules?: AlertRuleStat[]
  window?: { start: string; end: string }
  prevWindow?: { start: string; end: string }
  baseline?: { start: string; end: string }
  total?: number
  nextCursor?: string | null
}

const timeframeHours: Record<Filters['timeframe'], number> = {
  '24h': 24,
  '72h': 72,
  '7d': 24 * 7,
  '1m': 24 * 30,
  todo: 0,
}

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0
  if (prev === 0) return current === 0 ? 0 : 100
  return ((current - prev) / Math.abs(prev)) * 100
}

const calcSlaHours = (alerts: Alert[], referenceTime: number) => {
  if (!alerts.length) return 0
  const totalHours = alerts.reduce((acc, alert) => {
    const createdAt = new Date(alert.createdAt).getTime()
    const diff = Math.max(0, referenceTime - createdAt)
    return acc + diff / (1000 * 60 * 60)
  }, 0)
  return totalHours / Math.max(1, alerts.length)
}

const AlertsPage: FC<Props> = ({
  posts,
  filters,
  search,
  apiBase,
  onApplyAlertScope,
  onOpenFeedStream,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>(
    {}
  )
  const [remotePayload, setRemotePayload] = useState<RemoteAlertsPayload | null>(
    null
  )

  const {
    currentPosts,
    prevPosts,
    prevPrevPosts,
    rangeLabel,
    windowStart,
    windowEnd,
    prevWindowEnd,
  } = useMemo(() => {
    if (!posts.length) {
      return {
        currentPosts: [],
        prevPosts: [],
        prevPrevPosts: [],
        rangeLabel: 'Sin datos',
        windowStart: new Date(),
        windowEnd: new Date(),
        prevWindowEnd: new Date(),
      }
    }

    const matchesNonDateFilters = (post: SocialPost) => {
      if (filters.sentiment !== 'todos' && post.sentiment !== filters.sentiment)
        return false
      if (filters.platform !== 'todos' && post.platform !== filters.platform)
        return false
      if (filters.cluster !== 'todos' && post.cluster !== filters.cluster) return false
      if (filters.subcluster !== 'todos' && post.subcluster !== filters.subcluster)
        return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic} ${post.cluster} ${post.subcluster} ${post.microcluster}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    }

    const matching = posts.filter(matchesNonDateFilters)
    if (!matching.length) {
      return {
        currentPosts: [],
        prevPosts: [],
        prevPrevPosts: [],
        rangeLabel: 'Sin datos',
        windowStart: new Date(),
        windowEnd: new Date(),
        prevWindowEnd: new Date(),
      }
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
    const prevEnd = new Date(start.getTime())
    const prevPrevStart = new Date(prevStart.getTime() - windowMs)
    const prevPrevEnd = new Date(prevStart.getTime())

    const inRange = (post: SocialPost, rangeStart: Date, rangeEnd: Date) => {
      const ts = new Date(post.timestamp).getTime()
      return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime()
    }

    const current = matching.filter((post) => inRange(post, start, end))
    const prev = matching.filter((post) => inRange(post, prevStart, prevEnd))
    const prevPrev = matching.filter((post) => inRange(post, prevPrevStart, prevPrevEnd))

    return {
      currentPosts: current,
      prevPosts: prev,
      prevPrevPosts: prevPrev,
      rangeLabel: formatRange(start, end),
      windowStart: start,
      windowEnd: end,
      prevWindowEnd: prevEnd,
    }
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

  const localAlerts = useMemo(
    () => buildAlerts(currentPosts, prevPosts),
    [currentPosts, prevPosts]
  )

  const prevAlerts = useMemo(
    () => buildAlerts(prevPosts, prevPrevPosts),
    [prevPosts, prevPrevPosts]
  )

  useEffect(() => {
    if (!apiBase) {
      setRemotePayload(null)
      return
    }
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (filters.timeframe) params.set('timeframe', filters.timeframe)
    if (filters.sentiment !== 'todos') params.set('sentiment', filters.sentiment)
    if (filters.platform !== 'todos') params.set('platform', filters.platform)
    if (filters.cluster !== 'todos') params.set('cluster', filters.cluster)
    if (filters.subcluster !== 'todos') params.set('subcluster', filters.subcluster)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (search) params.set('search', search)

    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/alerts?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('No alerts API')
        const data = await res.json()
        if (Array.isArray(data.alerts)) {
          setRemotePayload(data)
        } else {
          setRemotePayload(null)
        }
      } catch {
        setRemotePayload(null)
      }
    }

    load()
    return () => controller.abort()
  }, [
    apiBase,
    filters.timeframe,
    filters.sentiment,
    filters.platform,
    filters.cluster,
    filters.subcluster,
    filters.dateFrom,
    filters.dateTo,
    search,
  ])

  const alerts = useMemo(() => {
    const base = remotePayload?.alerts ?? localAlerts
    return base.map((alert) => ({
      ...alert,
      status: statusOverrides[alert.id] ?? alert.status,
    }))
  }, [localAlerts, remotePayload, statusOverrides])

  useEffect(() => {
    if (!alerts.length) {
      setSelectedAlertId(null)
      return
    }
    if (!selectedAlertId || !alerts.find((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(alerts[0].id)
    }
  }, [alerts, selectedAlertId])

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId]
  )

  const pulseStats = useMemo(() => {
    if (remotePayload?.pulseStats) {
      return remotePayload.pulseStats
    }
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
  }, [alerts, prevAlerts, rangeLabel, windowEnd, prevWindowEnd, remotePayload])

  const timeline = useMemo(
    () =>
      remotePayload?.timeline ??
      buildAlertTimeline(alerts, windowStart, windowEnd),
    [alerts, windowStart, windowEnd, remotePayload]
  )
  const rules = useMemo(
    () => remotePayload?.rules ?? buildAlertRuleStats(alerts, defaultAlertThresholds),
    [alerts, remotePayload]
  )

  const buildActionSnapshot = (alert: Alert) => ({
    id: alert.id,
    scopeType: alert.scopeType,
    scopeId: alert.scopeId,
    scopeLabel: alert.scopeLabel,
    title: alert.title,
    summary: alert.summary,
    severity: alert.severity,
    priority: alert.priority,
    owner: alert.owner,
    team: alert.team,
    assignee: alert.assignee,
    firstSeenAt: alert.firstSeenAt,
    lastSeenAt: alert.lastSeenAt,
    occurrences: alert.occurrences,
    activeWindowCount: alert.activeWindowCount,
    confidence: alert.confidence,
    ruleIds: alert.ruleIds,
    ruleValues: alert.ruleValues,
    uniqueAuthors: alert.uniqueAuthors,
    newAuthorsPct: alert.newAuthorsPct,
    geoSpread: alert.geoSpread,
    topEntities: alert.topEntities,
    keywords: alert.keywords,
  })

  const handleAction = (alertId: string, action: AlertStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [alertId]: action }))
    if (!apiBase) return
    const alert = alerts.find((item) => item.id === alertId)
    const payload: Record<string, unknown> = { action }
    if (alert) {
      payload.alert = buildActionSnapshot(alert)
    }
    if (action === 'snoozed') {
      payload.snoozeUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }
    fetch(`${apiBase}/alerts/${encodeURIComponent(alertId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  }

  const handleBulkAction = (alertIds: string[], action: AlertStatus) => {
    alertIds.forEach((id) => handleAction(id, action))
  }

  return (
    <main className='p-4 md:p-6 space-y-6 overflow-y-auto'>
      <AlertsPulse stats={pulseStats} />

      <div className='grid gap-4 xl:grid-cols-[1.6fr_1fr]'>
        <AlertsStream
          alerts={alerts}
          selectedAlertId={selectedAlertId}
          onSelectAlert={setSelectedAlertId}
          onAction={handleAction}
          onBulkAction={handleBulkAction}
        />
        <AlertIntel
          alert={selectedAlert}
          onApplyScope={onApplyAlertScope}
          onOpenFeedStream={onOpenFeedStream}
        />
      </div>

      <AlertTimeline timeline={timeline} rules={rules} />
    </main>
  )
}

export default AlertsPage
