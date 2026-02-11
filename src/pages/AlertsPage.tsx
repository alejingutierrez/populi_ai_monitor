import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import AlertIntel from '../components/AlertIntel'
import AlertScopePropagation from '../components/AlertScopePropagation'
import AlertSentimentShift from '../components/AlertSentimentShift'
import AlertSignalsPanel from '../components/AlertSignalsPanel'
import AlertsLifecyclePanel from '../components/AlertsLifecyclePanel'
import AlertsPulse from '../components/AlertsPulse'
import AlertsStream from '../components/AlertsStream'
import ResizableHorizontalSplit from '../components/ResizableHorizontalSplit'
import type { Filters } from '../components/FilterBar'
import SummaryGrid, { type SummaryMetrics } from '../components/SummaryGrid'
import {
  buildAlerts,
  formatRange,
  type Alert,
  type AlertAction,
  type AlertHistoryPoint,
  type AlertStatus,
} from '../data/alerts'
import type { SocialPost } from '../types'

interface Props {
  metrics: SummaryMetrics
  posts: SocialPost[]
  filters: Filters
  search: string
  apiBase?: string
  onApplyAlertScope?: (alert: Alert) => void
  onOpenFeedStream?: (alert: Alert) => void
  onRequestInsight?: (alert: Alert) => void
}

type ActionOptions = {
  snoozeUntil?: string
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
  window?: { start: string; end: string }
  prevWindow?: { start: string; end: string }
  baseline?: { start: string; end: string }
  total?: number
  nextCursor?: string | null
}

type RemoteAlertDetailPayload = {
  alert: Alert
  history?: AlertHistoryPoint[]
  relatedAlerts?: Alert[]
}

type RemoteAlertActionsPayload = {
  actions: AlertAction[]
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
  metrics,
  posts,
  filters,
  search,
  apiBase,
  onApplyAlertScope,
  onOpenFeedStream,
  onRequestInsight,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>(
    {}
  )
  const [remotePayload, setRemotePayload] = useState<RemoteAlertsPayload | null>(
    null
  )
  const [remoteDetail, setRemoteDetail] = useState<RemoteAlertDetailPayload | null>(
    null
  )
  const [remoteActions, setRemoteActions] = useState<AlertAction[] | null>(null)
  const [hydrateTick, setHydrateTick] = useState(0)
  const [isHydrating, setIsHydrating] = useState(false)
  const [actor, setActor] = useState('Operador')
  const [localActionLog, setLocalActionLog] = useState<Record<string, AlertAction[]>>(
    {}
  )
  const [layoutPreset, setLayoutPreset] = useState<
    'triage' | 'investigacion' | 'lectura' | 'custom'
  >('investigacion')
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isResizing, setIsResizing] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(min-width: 1280px)')
    const sync = () => setIsWide(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('alerts:actor')
    if (stored && stored.trim()) setActor(stored)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('alerts:actor', actor)
  }, [actor])

  useEffect(() => {
    if (!isResizing) return
    const handleMove = (event: PointerEvent) => {
      if (!layoutRef.current) return
      const rect = layoutRef.current.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      const nextRatio = Math.min(0.6, Math.max(0.25, ratio))
      setSplitRatio(nextRatio)
      setLayoutPreset('custom')
    }
    const handleUp = () => setIsResizing(false)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizing])

  const applyPreset = (preset: 'triage' | 'investigacion' | 'lectura') => {
    const ratios = {
      triage: 0.46,
      investigacion: 0.5,
      lectura: 0.54,
    }
    setLayoutPreset(preset)
    setSplitRatio(ratios[preset])
  }

  const {
    currentPosts,
    prevPosts,
    prevPrevPosts,
    rangeLabel,
    windowEnd,
    prevWindowStart,
    prevWindowEnd,
  } = useMemo(() => {
    if (!posts.length) {
      return {
        currentPosts: [],
        prevPosts: [],
        prevPrevPosts: [],
        rangeLabel: 'Sin datos',
        windowEnd: new Date(),
        prevWindowStart: new Date(),
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
        windowEnd: new Date(),
        prevWindowStart: new Date(),
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
      windowEnd: end,
      prevWindowStart: prevStart,
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

  const alertQueryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.timeframe) params.set('timeframe', filters.timeframe)
    if (filters.sentiment !== 'todos') params.set('sentiment', filters.sentiment)
    if (filters.platform !== 'todos') params.set('platform', filters.platform)
    if (filters.cluster !== 'todos') params.set('cluster', filters.cluster)
    if (filters.subcluster !== 'todos') params.set('subcluster', filters.subcluster)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (search) params.set('search', search)
    return params.toString()
  }, [
    filters.timeframe,
    filters.sentiment,
    filters.platform,
    filters.cluster,
    filters.subcluster,
    filters.dateFrom,
    filters.dateTo,
    search,
  ])

  useEffect(() => {
    if (!apiBase) {
      setRemotePayload(null)
      return
    }
    const controller = new AbortController()

    const load = async () => {
      try {
        const url = alertQueryString ? `${apiBase}/alerts?${alertQueryString}` : `${apiBase}/alerts`
        const res = await fetch(url, {
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
    alertQueryString,
  ])

  useEffect(() => {
    if (!apiBase || !selectedAlertId) {
      setRemoteDetail(null)
      setRemoteActions(null)
      setIsHydrating(false)
      return
    }

    const controller = new AbortController()
    const id = selectedAlertId

    const load = async () => {
      setIsHydrating(true)
      try {
        const detailUrl = alertQueryString
          ? `${apiBase}/alerts/${encodeURIComponent(id)}?${alertQueryString}`
          : `${apiBase}/alerts/${encodeURIComponent(id)}`
        const actionsUrl = `${apiBase}/alerts/${encodeURIComponent(id)}/actions?limit=25`

        const [detailRes, actionsRes] = await Promise.all([
          fetch(detailUrl, { signal: controller.signal }),
          fetch(actionsUrl, { signal: controller.signal }),
        ])

        if (!controller.signal.aborted) {
          if (detailRes.ok) {
            const data = (await detailRes.json()) as RemoteAlertDetailPayload
            if (data && typeof data === 'object' && (data as RemoteAlertDetailPayload).alert) {
              setRemoteDetail(data)
            } else {
              setRemoteDetail(null)
            }
          } else {
            setRemoteDetail(null)
          }

          if (actionsRes.ok) {
            const data = (await actionsRes.json()) as Partial<RemoteAlertActionsPayload>
            setRemoteActions(Array.isArray(data?.actions) ? data.actions : [])
          } else {
            setRemoteActions(null)
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setRemoteDetail(null)
          setRemoteActions(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsHydrating(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [apiBase, selectedAlertId, alertQueryString, hydrateTick])

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

  const intelAlert = useMemo(() => {
    const base =
      remoteDetail?.alert && remoteDetail.alert.id === selectedAlertId
        ? remoteDetail.alert
        : selectedAlert
    if (!base) return null
    return {
      ...base,
      status: statusOverrides[base.id] ?? base.status,
    }
  }, [remoteDetail, selectedAlert, selectedAlertId, statusOverrides])

  const localHistory = useMemo<AlertHistoryPoint[]>(() => {
    if (!selectedAlert) return []
    const points: AlertHistoryPoint[] = []
    const prevMatch = prevAlerts.find((item) => item.id === selectedAlert.id)
    if (prevMatch) {
      points.push({
        windowStart: prevWindowStart.toISOString(),
        windowEnd: prevWindowEnd.toISOString(),
        severity: prevMatch.severity,
        status: prevMatch.status,
        metrics: prevMatch.metrics,
        signals: prevMatch.signals,
      })
    }
    points.push({
      windowStart: prevWindowEnd.toISOString(),
      windowEnd: windowEnd.toISOString(),
      severity: selectedAlert.severity,
      status: selectedAlert.status,
      metrics: selectedAlert.metrics,
      signals: selectedAlert.signals,
    })
    return points
  }, [selectedAlert, prevAlerts, prevWindowStart, prevWindowEnd, windowEnd])

  const intelHistory = useMemo(() => {
    const base =
      remoteDetail?.history && remoteDetail.alert?.id === selectedAlertId
        ? remoteDetail.history
        : localHistory
    const override = selectedAlertId ? statusOverrides[selectedAlertId] : undefined
    if (!override || !base.length) return base
    return base.map((point, index) =>
      index === base.length - 1 ? { ...point, status: override } : point
    )
  }, [remoteDetail, localHistory, selectedAlertId, statusOverrides])

  const localRelatedAlerts = useMemo(() => {
    if (!selectedAlert) return []
    return alerts
      .filter((item) => item.id !== selectedAlert.id && item.scopeType === selectedAlert.scopeType)
      .slice(0, 6)
  }, [alerts, selectedAlert])

  const intelRelatedAlerts = useMemo(() => {
    const base =
      remoteDetail?.relatedAlerts && remoteDetail.alert?.id === selectedAlertId
        ? remoteDetail.relatedAlerts
        : localRelatedAlerts
    if (!base.length) return base
    return base.map((item) => ({
      ...item,
      status: statusOverrides[item.id] ?? item.status,
    }))
  }, [remoteDetail, localRelatedAlerts, selectedAlertId, statusOverrides])

  const localActions = useMemo(
    () => (selectedAlertId ? localActionLog[selectedAlertId] ?? [] : []),
    [localActionLog, selectedAlertId]
  )

  const intelActions = useMemo(
    () => (remoteActions !== null ? remoteActions : localActions),
    [remoteActions, localActions]
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

  const displayRangeLabel = useMemo(() => {
    if (remotePayload?.window) {
      return formatRange(
        new Date(remotePayload.window.start),
        new Date(remotePayload.window.end)
      )
    }
    return rangeLabel
  }, [remotePayload, rangeLabel])

  const prevRangeLabel = useMemo(() => {
    if (remotePayload?.prevWindow) {
      return formatRange(
        new Date(remotePayload.prevWindow.start),
        new Date(remotePayload.prevWindow.end)
      )
    }
    return formatRange(prevWindowStart, prevWindowEnd)
  }, [remotePayload, prevWindowStart, prevWindowEnd])

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

  const handleAction = (
    alertId: string,
    action: AlertStatus,
    options?: ActionOptions
  ) => {
    const nowIso = new Date().toISOString()
    const entry: AlertAction = {
      id: `${alertId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      action,
      actor: actor.trim() ? actor.trim() : null,
      note: null,
      createdAt: nowIso,
    }
    setLocalActionLog((prev) => {
      const prevList = prev[alertId] ?? []
      return {
        ...prev,
        [alertId]: [entry, ...prevList].slice(0, 25),
      }
    })
    setRemoteActions((prev) => (prev ? [entry, ...prev].slice(0, 25) : prev))
    setStatusOverrides((prev) => ({ ...prev, [alertId]: action }))
    if (!apiBase) return
    const alert = alerts.find((item) => item.id === alertId)
    const payload: Record<string, unknown> = { action }
    if (alert) {
      payload.alert = buildActionSnapshot(alert)
    }
    if (actor.trim()) {
      payload.actor = actor.trim()
    }
    if (action === 'snoozed') {
      payload.snoozeUntil =
        options?.snoozeUntil ??
        new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }
    fetch(`${apiBase}/alerts/${encodeURIComponent(alertId)}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(() => {
        if (alertId === selectedAlertId) {
          setHydrateTick((prev) => prev + 1)
        }
      })
      .catch(() => undefined)
  }

  const handleBulkAction = (
    alertIds: string[],
    action: AlertStatus,
    options?: ActionOptions
  ) => {
    alertIds.forEach((id) => handleAction(id, action, options))
  }

  const gridTemplateColumns = `${Math.round(splitRatio * 100)}% 12px ${Math.round(
    (1 - splitRatio) * 100
  )}%`

  return (
    <main className='p-4 md:p-6 space-y-6 overflow-y-auto'>
      <SummaryGrid metrics={metrics} />
      <AlertsPulse stats={pulseStats} />

      <div className='rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600'>
        Viendo: <span className='font-semibold text-slate-700'>{displayRangeLabel}</span> ·
        Comparado con{' '}
        <span className='font-semibold text-slate-700'>{prevRangeLabel}</span>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold'>
          Layout
        </span>
        {([
          { key: 'triage', label: 'Triage' },
          { key: 'investigacion', label: 'Investigación' },
          { key: 'lectura', label: 'Lectura' },
        ] as const).map((preset) => (
          <button
            key={preset.key}
            type='button'
            onClick={() => applyPreset(preset.key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              layoutPreset === preset.key
                ? 'border-prBlue bg-prBlue/10 text-prBlue'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
        {layoutPreset === 'custom' ? (
          <span className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700'>
            Personalizado
          </span>
        ) : null}

        <div className='flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm'>
          <span className='text-[10px] uppercase tracking-[0.14em] text-slate-400'>
            Actor
          </span>
          <input
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            className='w-32 bg-transparent text-xs font-semibold text-slate-700 focus:outline-none'
            placeholder='Operador'
          />
        </div>
      </div>

      <div
        ref={layoutRef}
        className='grid gap-4 xl:gap-0'
        style={isWide ? { gridTemplateColumns } : undefined}
      >
        <AlertsStream
          alerts={alerts}
          selectedAlertId={selectedAlertId}
          onSelectAlert={setSelectedAlertId}
          onAction={handleAction}
          onBulkAction={handleBulkAction}
        />
        <div
          role='separator'
          aria-orientation='vertical'
          className={`hidden xl:flex items-center justify-center ${
            isResizing ? 'bg-prBlue/10' : 'bg-transparent'
          }`}
        >
          <button
            type='button'
            onPointerDown={() => setIsResizing(true)}
            className='h-24 w-2 rounded-full bg-slate-200 hover:bg-prBlue/40'
            title='Arrastra para ajustar'
          />
        </div>
        <AlertIntel
          alert={intelAlert}
          history={intelHistory}
          relatedAlerts={intelRelatedAlerts}
          actions={intelActions}
          isLoading={isHydrating}
          onSelectAlert={setSelectedAlertId}
          onApplyScope={onApplyAlertScope}
          onOpenFeedStream={onOpenFeedStream}
          onRequestInsight={onRequestInsight}
        />
      </div>

      <div className='space-y-4'>
        <ResizableHorizontalSplit
          storageKey='alerts:lifecycle-shift'
          defaultRatio={0.5}
          minRatio={0.34}
          maxRatio={0.66}
          left={<AlertsLifecyclePanel alerts={alerts} />}
          right={<AlertSentimentShift alerts={alerts} prevAlerts={prevAlerts} />}
        />
        <ResizableHorizontalSplit
          storageKey='alerts:signals-scope'
          defaultRatio={0.5}
          minRatio={0.34}
          maxRatio={0.66}
          left={<AlertSignalsPanel alert={intelAlert} />}
          right={<AlertScopePropagation alerts={alerts} />}
        />
      </div>

    </main>
  )
}

export default AlertsPage
