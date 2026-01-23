import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useMemo, type FC } from 'react'
import type { SocialPost, TimelineDatum } from '../types'
import type { Filters } from './FilterBar'

interface TrendItem {
  name: string
  current: number
  previous: number
  deltaPct: number
  share: number
}

interface RankedItem {
  name: string
  count: number
  share: number
}

interface AuthorStat {
  name: string
  posts: number
  reach: number
  engagement: number
  engagementRate: number
  score: number
}

interface RiskTopic {
  name: string
  negativeShare: number
  total: number
}

interface Props {
  posts: SocialPost[]
  filters: Filters
  timelineData: TimelineDatum[]
}

type NumericTimelineKey = Exclude<keyof TimelineDatum, 'time'>

const compactFormatter = new Intl.NumberFormat('es-PR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fullFormatter = new Intl.NumberFormat('es-PR')

const formatCompact = (value: number) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '0'

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

const buildDeltaBadge = (current: number, prev: number, prefersLower = false) => {
  const delta = pctChange(current, prev)
  const label = prev === 0 && current > 0 ? 'Nuevo' : `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`
  const isGood = prefersLower ? delta <= 0 : delta >= 0
  return {
    delta,
    label,
    tone: isGood
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700',
  }
}

const TrendRadar: FC<Props> = ({ posts, filters, timelineData }) => {
  const trendData = useMemo(() => {
    if (!posts.length) {
      return {
        rangeLabel: 'Sin datos',
        windowDays: 1,
        totalCurrent: 0,
        totalPrev: 0,
        reachCurrent: 0,
        reachPrev: 0,
        engagementCurrent: 0,
        engagementPrev: 0,
        avgEngagementCurrent: 0,
        avgEngagementPrev: 0,
        engagementRateCurrent: 0,
        engagementRatePrev: 0,
        sentimentCurrent: { positivo: 0, neutral: 0, negativo: 0 },
        sentimentPrev: { positivo: 0, neutral: 0, negativo: 0 },
        sentimentIndex: 0,
        sentimentIndexPrev: 0,
        riskScore: 0,
        riskScorePrev: 0,
        topics: [] as TrendItem[],
        clusters: [] as TrendItem[],
        subclusters: [] as TrendItem[],
        microclusters: [] as TrendItem[],
        topTopics: [] as TrendItem[],
        topClusters: [] as TrendItem[],
        topSubclusters: [] as TrendItem[],
        topMicroclusters: [] as TrendItem[],
        platformMix: [] as RankedItem[],
        mediaMix: [] as RankedItem[],
        cityMix: [] as TrendItem[],
        authors: [] as AuthorStat[],
        riskTopics: [] as RiskTopic[],
      }
    }

    const timestamps = posts.map((post) => new Date(post.timestamp).getTime())
    const maxTs = Math.max(...timestamps)
    const minTs = Math.min(...timestamps)

    const timeframeHours: Record<Filters['timeframe'], number> = {
      '24h': 24,
      '72h': 72,
      '7d': 24 * 7,
      '1m': 24 * 30,
      todo: 0,
    }

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

    const dayMs = 24 * 60 * 60 * 1000
    const windowMs = Math.max(1, end.getTime() - start.getTime())
    const prevStart = new Date(start.getTime() - windowMs)
    const windowDays = Math.max(1, Math.ceil(windowMs / dayMs))

    const sentimentCurrent = { positivo: 0, neutral: 0, negativo: 0 }
    const sentimentPrev = { positivo: 0, neutral: 0, negativo: 0 }

    const topicMap = new Map<string, { current: number; prev: number }>()
    const clusterMap = new Map<string, { current: number; prev: number }>()
    const subclusterMap = new Map<string, { current: number; prev: number }>()
    const microclusterMap = new Map<string, { current: number; prev: number }>()
    const cityMap = new Map<string, { current: number; prev: number }>()
    const platformMap = new Map<string, number>()
    const mediaMap = new Map<SocialPost['mediaType'], number>()
    const authorMap = new Map<string, { posts: number; reach: number; engagement: number }>()
    const topicRiskMap = new Map<string, { total: number; negative: number }>()

    let totalCurrent = 0
    let totalPrev = 0
    let reachCurrent = 0
    let reachPrev = 0
    let engagementCurrent = 0
    let engagementPrev = 0
    let sentimentWeightedScore = 0
    let sentimentWeightTotal = 0
    let sentimentWeightedScorePrev = 0
    let sentimentWeightTotalPrev = 0
    let positiveReach = 0
    let neutralReach = 0
    let negativeReach = 0
    let positiveReachPrev = 0
    let neutralReachPrev = 0
    let negativeReachPrev = 0

    const updateTrendMap = (
      map: Map<string, { current: number; prev: number }>,
      key: string,
      isCurrent: boolean,
      isPrev: boolean
    ) => {
      const entry = map.get(key) ?? { current: 0, prev: 0 }
      if (isCurrent) entry.current += 1
      if (isPrev) entry.prev += 1
      map.set(key, entry)
    }

    posts.forEach((post) => {
      const ts = new Date(post.timestamp).getTime()
      const isCurrent = ts >= start.getTime() && ts <= end.getTime()
      const isPrev = ts >= prevStart.getTime() && ts < start.getTime()

      updateTrendMap(topicMap, post.topic, isCurrent, isPrev)
      updateTrendMap(clusterMap, post.cluster, isCurrent, isPrev)
      updateTrendMap(subclusterMap, post.subcluster, isCurrent, isPrev)
      updateTrendMap(microclusterMap, post.microcluster, isCurrent, isPrev)
      updateTrendMap(cityMap, post.location.city, isCurrent, isPrev)

      if (isCurrent) {
        totalCurrent += 1
        reachCurrent += post.reach
        engagementCurrent += post.engagement
        sentimentCurrent[post.sentiment] += 1
        platformMap.set(post.platform, (platformMap.get(post.platform) ?? 0) + 1)
        mediaMap.set(post.mediaType, (mediaMap.get(post.mediaType) ?? 0) + 1)
        const author = authorMap.get(post.author) ?? { posts: 0, reach: 0, engagement: 0 }
        author.posts += 1
        author.reach += post.reach
        author.engagement += post.engagement
        authorMap.set(post.author, author)
        const topicRisk = topicRiskMap.get(post.topic) ?? { total: 0, negative: 0 }
        topicRisk.total += 1
        if (post.sentiment === 'negativo') topicRisk.negative += 1
        topicRiskMap.set(post.topic, topicRisk)
        const weight = post.reach > 0 ? post.reach : 1
        const sentimentScore = post.sentiment === 'positivo' ? 1 : post.sentiment === 'neutral' ? 0.5 : 0
        sentimentWeightedScore += sentimentScore * weight
        sentimentWeightTotal += weight
        if (post.sentiment === 'positivo') positiveReach += weight
        if (post.sentiment === 'neutral') neutralReach += weight
        if (post.sentiment === 'negativo') negativeReach += weight
      }

      if (isPrev) {
        totalPrev += 1
        reachPrev += post.reach
        engagementPrev += post.engagement
        sentimentPrev[post.sentiment] += 1
        const weight = post.reach > 0 ? post.reach : 1
        const sentimentScore = post.sentiment === 'positivo' ? 1 : post.sentiment === 'neutral' ? 0.5 : 0
        sentimentWeightedScorePrev += sentimentScore * weight
        sentimentWeightTotalPrev += weight
        if (post.sentiment === 'positivo') positiveReachPrev += weight
        if (post.sentiment === 'neutral') neutralReachPrev += weight
        if (post.sentiment === 'negativo') negativeReachPrev += weight
      }
    })

    const toTrendItems = (map: Map<string, { current: number; prev: number }>) =>
      Array.from(map.entries())
        .map(([name, counts]) => {
          const deltaPct = counts.prev
            ? ((counts.current - counts.prev) / counts.prev) * 100
            : counts.current
            ? 100
            : 0
          const share = totalCurrent ? (counts.current / totalCurrent) * 100 : 0
          return { name, current: counts.current, previous: counts.prev, deltaPct, share }
        })
        .sort((a, b) => b.current - a.current)

    const toRankedItems = (map: Map<string, number>, total: number) =>
      Array.from(map.entries())
        .map(([name, count]) => ({ name, count, share: total ? (count / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count)

    const topics = toTrendItems(topicMap)
    const clusters = toTrendItems(clusterMap)
    const subclusters = toTrendItems(subclusterMap)
    const microclusters = toTrendItems(microclusterMap)
    const cityMix = toTrendItems(cityMap)

    const minTrendVolume = Math.max(5, Math.round(totalCurrent * 0.01))

    const risingSubclusters = subclusters
      .filter((item) => item.current >= minTrendVolume && item.deltaPct > 0)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 4)

    const risingMicroclusters = microclusters
      .filter((item) => item.current >= minTrendVolume && item.deltaPct > 0)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, 4)

    const riskTopics = Array.from(topicRiskMap.entries())
      .map(([name, data]) => ({
        name,
        negativeShare: data.total ? (data.negative / data.total) * 100 : 0,
        total: data.total,
      }))
      .filter((item) => item.total >= minTrendVolume)
      .sort((a, b) => b.negativeShare - a.negativeShare)
      .slice(0, 3)

    const authors = Array.from(authorMap.entries())
      .map(([name, data]) => ({
        name,
        posts: data.posts,
        reach: data.reach,
        engagement: data.engagement,
        engagementRate: data.reach ? (data.engagement / data.reach) * 100 : 0,
        score: data.reach + data.engagement * 5,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const avgEngagementCurrent = totalCurrent ? engagementCurrent / totalCurrent : 0
    const avgEngagementPrev = totalPrev ? engagementPrev / totalPrev : 0
    const engagementRateCurrent = reachCurrent ? (engagementCurrent / reachCurrent) * 100 : 0
    const engagementRatePrev = reachPrev ? (engagementPrev / reachPrev) * 100 : 0

    const sentimentIndex = sentimentWeightTotal
      ? (sentimentWeightedScore / sentimentWeightTotal) * 100
      : 0

    const sentimentIndexPrev = sentimentWeightTotalPrev
      ? (sentimentWeightedScorePrev / sentimentWeightTotalPrev) * 100
      : 0

    const riskScore = (() => {
      if (!reachCurrent) return 0
      const riskRaw = (negativeReach * 1.2 + neutralReach * 0.5 - positiveReach * 0.3) / reachCurrent
      return Math.min(100, Math.max(0, riskRaw * 100))
    })()

    const riskScorePrev = (() => {
      if (!reachPrev) return 0
      const riskRaw =
        (negativeReachPrev * 1.2 + neutralReachPrev * 0.5 - positiveReachPrev * 0.3) /
        reachPrev
      return Math.min(100, Math.max(0, riskRaw * 100))
    })()

    return {
      rangeLabel: formatRange(start, end),
      windowDays,
      totalCurrent,
      totalPrev,
      reachCurrent,
      reachPrev,
      engagementCurrent,
      engagementPrev,
      avgEngagementCurrent,
      avgEngagementPrev,
      engagementRateCurrent,
      engagementRatePrev,
      sentimentCurrent,
      sentimentPrev,
      sentimentIndex,
      sentimentIndexPrev,
      riskScore,
      riskScorePrev,
      topics,
      clusters,
      subclusters,
      microclusters,
      topTopics: topics.slice(0, 4),
      topClusters: clusters.slice(0, 4),
      topSubclusters: risingSubclusters,
      topMicroclusters: risingMicroclusters,
      platformMix: toRankedItems(platformMap, totalCurrent).slice(0, 3),
      mediaMix: toRankedItems(mediaMap, totalCurrent),
      cityMix: cityMix.slice(0, 4),
      authors,
      riskTopics,
    }
  }, [filters.dateFrom, filters.dateTo, filters.timeframe, posts])

  const totalDeltaBadge = buildDeltaBadge(trendData.totalCurrent, trendData.totalPrev)
  const reachDeltaBadge = buildDeltaBadge(trendData.reachCurrent, trendData.reachPrev)
  const engagementTotalBadge = buildDeltaBadge(
    trendData.engagementCurrent,
    trendData.engagementPrev
  )
  const rateDeltaBadge = buildDeltaBadge(
    trendData.engagementRateCurrent,
    trendData.engagementRatePrev
  )

  const sparkline = useMemo(() => {
    if (!timelineData.length) return { points: [] as number[], maxValue: 0 }
    const slice = timelineData.slice(-12)
    const max = Math.max(...slice.map((item) => item.publicaciones))
    const points = slice.map((item) => (max ? (item.publicaciones / max) * 100 : 0))
    return { points, maxValue: max }
  }, [timelineData])

  const momentum = useMemo(() => {
    if (timelineData.length < 4) return null
    const slice = timelineData.slice(-Math.min(8, timelineData.length))
    if (slice.length < 4) return null
    const mid = Math.floor(slice.length / 2)
    const prev = slice.slice(0, mid)
    const curr = slice.slice(mid)
    const sum = (arr: TimelineDatum[], key: NumericTimelineKey) =>
      arr.reduce((acc, item) => acc + item[key], 0)
    const avg = (arr: TimelineDatum[], key: NumericTimelineKey) =>
      arr.reduce((acc, item) => acc + item[key], 0) / (arr.length || 1)

    const volumeCurr = sum(curr, 'publicaciones')
    const volumePrev = sum(prev, 'publicaciones')
    const reachCurr = sum(curr, 'alcance')
    const reachPrev = sum(prev, 'alcance')
    const engagementCurr = avg(curr, 'engagement')
    const engagementPrev = avg(prev, 'engagement')
    const sentimentCurr = avg(curr, 'sentimentIndex')
    const sentimentPrev = avg(prev, 'sentimentIndex')
    const riskCurr = avg(curr, 'reputationalRisk')
    const riskPrev = avg(prev, 'reputationalRisk')
    const viralCurr = avg(curr, 'viralPropensity')
    const viralPrev = avg(prev, 'viralPropensity')

    return {
      volumen: { current: volumeCurr, prev: volumePrev, deltaPct: pctChange(volumeCurr, volumePrev) },
      alcance: { current: reachCurr, prev: reachPrev, deltaPct: pctChange(reachCurr, reachPrev) },
      engagement: { current: engagementCurr, prev: engagementPrev, deltaPct: pctChange(engagementCurr, engagementPrev) },
      sentimiento: { current: sentimentCurr, prev: sentimentPrev, deltaPct: pctChange(sentimentCurr, sentimentPrev) },
      riesgo: { current: riskCurr, prev: riskPrev, deltaPct: pctChange(riskCurr, riskPrev) },
      viralidad: { current: viralCurr, prev: viralPrev, deltaPct: pctChange(viralCurr, viralPrev) },
    }
  }, [timelineData])

  const sentimentTotal =
    trendData.sentimentCurrent.positivo +
    trendData.sentimentCurrent.neutral +
    trendData.sentimentCurrent.negativo
  const sentimentPrevTotal =
    trendData.sentimentPrev.positivo +
    trendData.sentimentPrev.neutral +
    trendData.sentimentPrev.negativo
  const negativeShare = sentimentTotal
    ? (trendData.sentimentCurrent.negativo / sentimentTotal) * 100
    : 0
  const prevNegativeShare = sentimentPrevTotal
    ? (trendData.sentimentPrev.negativo / sentimentPrevTotal) * 100
    : 0
  const negativeDelta = negativeShare - prevNegativeShare

  const insights = useMemo(() => {
    const items: string[] = []

    if (!trendData.totalCurrent) {
      items.push('Sin actividad suficiente para detectar patrones en esta ventana.')
      return items
    }

    const topTopic = trendData.topTopics[0]
    const topCluster = trendData.topClusters[0]
    const topRisk = trendData.riskTopics[0]
    const risingSubcluster = trendData.topSubclusters[0]
    if (topTopic) {
      items.push(
        `Tema dominante: ${topTopic.name} (${topTopic.share.toFixed(0)}% del volumen actual).`
      )
    }
    if (topCluster && Math.abs(topCluster.deltaPct) >= 30) {
      items.push(
        `Cluster ${topCluster.name} cambia ${topCluster.deltaPct >= 0 ? 'al alza' : 'a la baja'} (${topCluster.deltaPct.toFixed(0)}%).`
      )
    }
    if (totalDeltaBadge.delta >= 20) {
      items.push(`Volumen acelerado frente al periodo previo (+${totalDeltaBadge.delta.toFixed(0)}%).`)
    }
    if (negativeShare >= 35) {
      items.push(`Riesgo: negatividad alta (${negativeShare.toFixed(0)}%).`)
    }
    if (topRisk && topRisk.negativeShare >= 40) {
      items.push(
        `Foco negativo: ${topRisk.name} (${topRisk.negativeShare.toFixed(0)}% negativo).`
      )
    }
    if (risingSubcluster && risingSubcluster.deltaPct >= 35) {
      items.push(`Subcluster en alza: ${risingSubcluster.name} (+${risingSubcluster.deltaPct.toFixed(0)}%).`)
    }
    if (momentum?.viralidad && momentum.viralidad.deltaPct >= 20) {
      items.push('Potencial viral en aumento durante los últimos días.')
    }

    return items.slice(0, 3)
  }, [momentum, negativeShare, totalDeltaBadge.delta, trendData])

  const alertTags = useMemo(() => {
    const tags: { label: string; tone: string }[] = []
    if (totalDeltaBadge.delta >= 25) {
      tags.push({ label: 'Volumen en alza', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' })
    }
    if (negativeShare >= 35) {
      tags.push({ label: 'Negatividad alta', tone: 'border-rose-200 bg-rose-50 text-rose-700' })
    }
    if (trendData.riskScore >= 65) {
      tags.push({ label: 'Riesgo reputacional', tone: 'border-amber-200 bg-amber-50 text-amber-700' })
    }
    if (momentum?.viralidad && momentum.viralidad.deltaPct >= 25) {
      tags.push({ label: 'Viralidad al alza', tone: 'border-sky-200 bg-sky-50 text-sky-700' })
    }
    if (!tags.length) {
      tags.push({ label: 'Sin alertas críticas', tone: 'border-slate-200 bg-slate-100 text-slate-600' })
    }
    return tags.slice(0, 3)
  }, [momentum, negativeShare, totalDeltaBadge.delta, trendData.riskScore])

  return (
    <section className="card p-4">
      <div className="card-header items-start gap-4 flex-col lg:flex-row lg:items-center">
        <div>
          <p className="muted">Feed Stream</p>
          <p className="h-section">Trend radar inteligente</p>
          <p className="text-xs text-slate-500 mt-1">{trendData.rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
            Ventana comparativa
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
            Ventana: {trendData.windowDays} días
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-inner space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Volumen actual</p>
                <p className="text-3xl font-semibold text-ink">{fullFormatter.format(trendData.totalCurrent)}</p>
                <p className="text-xs text-slate-500">Comparativa previa: {fullFormatter.format(trendData.totalPrev)} menciones</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${totalDeltaBadge.tone}`}
              >
                {totalDeltaBadge.delta >= 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4" />
                )}
                {totalDeltaBadge.label}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: 'Alcance total',
                  value: formatCompact(trendData.reachCurrent),
                  title: fullFormatter.format(trendData.reachCurrent),
                  badge: reachDeltaBadge,
                  icon: <BoltIcon className="h-4 w-4" />,
                },
                {
                  label: 'Engagement total',
                  value: formatCompact(trendData.engagementCurrent),
                  title: fullFormatter.format(trendData.engagementCurrent),
                  badge: engagementTotalBadge,
                  icon: <ChatBubbleLeftRightIcon className="h-4 w-4" />,
                },
                {
                  label: 'Tasa engagement',
                  value: `${trendData.engagementRateCurrent.toFixed(1)}%`,
                  title: `${trendData.engagementRateCurrent.toFixed(2)}%`,
                  badge: rateDeltaBadge,
                  icon: <ChartBarIcon className="h-4 w-4" />,
                },
                {
                  label: 'Riesgo reputacional',
                  value: `${trendData.riskScore.toFixed(1)} / 100`,
                  title: `${trendData.riskScore.toFixed(2)} / 100`,
                  badge: buildDeltaBadge(trendData.riskScore, trendData.riskScorePrev, true),
                  icon: <ExclamationTriangleIcon className="h-4 w-4" />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
                        {item.label}
                      </p>
                      <p className="text-lg font-semibold text-ink" title={item.title}>
                        {item.value}
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500">
                      {item.icon}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Ventana actual</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${item.badge.tone}`}>
                      {item.badge.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Ritmo diario</p>
                <span className="text-[11px] text-slate-500">
                  Pico reciente: {sparkline.maxValue ? fullFormatter.format(sparkline.maxValue) : 0} menciones
                </span>
              </div>
              <div className="mt-2 flex items-end gap-1 h-12">
                {sparkline.points.length ? (
                  sparkline.points.map((height, index) => (
                    <span
                      key={`spark-${index}`}
                      className="flex-1 rounded-full bg-prBlue/70"
                      style={{ height: `${Math.max(12, height)}%` }}
                    />
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Sin serie para sparkline.</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                {momentum ? (
                  [
                    { label: 'Volumen', data: momentum.volumen },
                    { label: 'Viralidad', data: momentum.viralidad },
                    { label: 'Sentimiento', data: momentum.sentimiento },
                  ].map((item) => {
                    const tone = buildDeltaBadge(item.data.current, item.data.prev)
                    return (
                      <span
                        key={item.label}
                        className={`rounded-full border px-2.5 py-1 ${tone.tone}`}
                      >
                        {item.label} {tone.label}
                      </span>
                    )
                  })
                ) : (
                  <span className="text-xs text-slate-500">Sin historial suficiente para impulso.</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
              Sentimiento y riesgo
            </p>
            <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${sentimentTotal ? (trendData.sentimentCurrent.positivo / sentimentTotal) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-slate-300"
                style={{ width: `${sentimentTotal ? (trendData.sentimentCurrent.neutral / sentimentTotal) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${sentimentTotal ? (trendData.sentimentCurrent.negativo / sentimentTotal) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                Positivo {sentimentTotal ? Math.round((trendData.sentimentCurrent.positivo / sentimentTotal) * 100) : 0}%
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                Neutral {sentimentTotal ? Math.round((trendData.sentimentCurrent.neutral / sentimentTotal) * 100) : 0}%
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                Negativo {sentimentTotal ? Math.round((trendData.sentimentCurrent.negativo / sentimentTotal) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 space-y-1">
              <p>
                Negatividad actual: {negativeShare.toFixed(0)}% ({negativeDelta >= 0 ? '+' : ''}
                {negativeDelta.toFixed(0)} pp vs previa)
              </p>
              <p>Índice sentimiento: {trendData.sentimentIndex.toFixed(1)} / 100</p>
              <p>Riesgo reputacional: {trendData.riskScore.toFixed(1)} / 100</p>
              {trendData.riskTopics[0] ? (
                <p>
                  Tema más negativo: {trendData.riskTopics[0].name} ({trendData.riskTopics[0].negativeShare.toFixed(0)}%)
                </p>
              ) : null}
            </div>
          </div>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">IA observa</p>
            </div>
            <ul className="mt-2 space-y-2 text-xs text-slate-600 leading-relaxed">
              {insights.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {!insights.length ? <li>Sin señales relevantes todavía.</li> : null}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              {alertTags.map((tag) => (
                <span key={tag.label} className={`rounded-full border px-2.5 py-1 ${tag.tone}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
              Canales clave
            </p>
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">Plataformas</p>
                {trendData.platformMix.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 text-xs text-slate-600 min-w-0">
                    <span className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</span>
                    <span className="shrink-0">{item.share.toFixed(0)}%</span>
                  </div>
                ))}
                {!trendData.platformMix.length ? (
                  <p className="text-xs text-slate-500">Sin datos de plataformas.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em]">Formatos</p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  {trendData.mediaMix.slice(0, 3).map((item) => (
                    <span
                      key={item.name}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600"
                    >
                      {item.name} · {item.share.toFixed(0)}%
                    </span>
                  ))}
                  {!trendData.mediaMix.length ? (
                    <span className="text-xs text-slate-500">Sin datos de formatos.</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
                Hotspots territoriales
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {trendData.cityMix.map((city) => (
                <div key={city.name} className="flex items-center justify-between gap-2 text-xs text-slate-600 min-w-0">
                  <span className="font-semibold text-slate-700 truncate" title={city.name}>{city.name}</span>
                  <span className="shrink-0">
                    {city.share.toFixed(0)}% · {fullFormatter.format(city.current)}
                  </span>
                </div>
              ))}
              {!trendData.cityMix.length ? (
                <p className="text-xs text-slate-500">Sin municipios destacados.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
                Autores influyentes
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {trendData.authors.map((author) => (
                <div key={author.name} className="text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-semibold text-slate-700 truncate" title={author.name}>{author.name}</span>
                    <span className="shrink-0">{formatCompact(author.reach)} alcance</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
                    <span className="truncate">{author.posts} posts · {author.engagementRate.toFixed(1)}% engagement</span>
                    <span className="shrink-0">{formatCompact(author.engagement)} interacciones</span>
                  </div>
                </div>
              ))}
              {!trendData.authors.length ? (
                <p className="text-xs text-slate-500">Sin autores destacados.</p>
              ) : null}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default TrendRadar
