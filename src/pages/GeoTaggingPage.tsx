import type { FC } from 'react'
import { useMemo, useState } from 'react'
import GeoDrilldown from '../components/GeoDrilldown'
import GeoPulse from '../components/GeoPulse'
import GeoSentimentPanel from '../components/GeoSentimentPanel'
import GeoTerritoryIntel from '../components/GeoTerritoryIntel'
import GeoTopicsPanel from '../components/GeoTopicsPanel'
import MapView from '../components/MapView'
import ResizableHorizontalSplit from '../components/ResizableHorizontalSplit'
import type { Filters } from '../components/FilterBar'
import SummaryGrid, { type SummaryMetrics } from '../components/SummaryGrid'
import {
  buildLocationInsights,
  calcRiskScore,
  calcSentimentIndex,
  type CityInsight,
} from '../data/geoInsights'
import type { SocialPost } from '../types'

interface Props {
  metrics: SummaryMetrics
  posts: SocialPost[]
  filteredPosts: SocialPost[]
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

const buildGeoStats = (posts: SocialPost[]) => {
  const totalPosts = posts.length
  const reach = posts.reduce((acc, post) => acc + post.reach, 0)
  const activeCities = new Set(posts.map((post) => post.location.city)).size
  const riskScore = calcRiskScore(posts)
  const sentiments = posts.reduce(
    (acc, post) => {
      acc[post.sentiment] += 1
      return acc
    },
    { positivo: 0, neutral: 0, negativo: 0 }
  )
  return {
    totalPosts,
    reach,
    activeCities,
    riskScore,
    sentiments,
    sentimentIndex: calcSentimentIndex(posts),
  }
}

const buildTopTopics = (posts: SocialPost[], limit = 3) => {
  const topicMap = new Map<string, number>()
  posts.forEach((post) => {
    topicMap.set(post.topic, (topicMap.get(post.topic) ?? 0) + 1)
  })
  return Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

const GeoTaggingPage: FC<Props> = ({
  metrics,
  posts,
  filteredPosts,
  filters,
  search,
}) => {
  const [selectedCity, setSelectedCity] = useState<CityInsight | null>(null)

  const locationInsights = useMemo(
    () => buildLocationInsights(filteredPosts),
    [filteredPosts]
  )

  const { currentPosts, prevPosts, rangeLabel } = useMemo(() => {
    if (!posts.length) {
      return { currentPosts: [], prevPosts: [], rangeLabel: 'Sin datos' }
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

  const currentStats = useMemo(() => buildGeoStats(currentPosts), [currentPosts])
  const prevStats = useMemo(() => buildGeoStats(prevPosts), [prevPosts])

  const pulseStats = useMemo(
    () => ({
      activeCities: currentStats.activeCities,
      totalPosts: currentStats.totalPosts,
      reach: currentStats.reach,
      riskScore: currentStats.riskScore,
      rangeLabel,
      deltas: {
        activeCitiesPct: pctChange(currentStats.activeCities, prevStats.activeCities),
        totalPostsPct: pctChange(currentStats.totalPosts, prevStats.totalPosts),
        reachPct: pctChange(currentStats.reach, prevStats.reach),
        riskPct: pctChange(currentStats.riskScore, prevStats.riskScore),
      },
    }),
    [currentStats, prevStats, rangeLabel]
  )

  const topicsPanel = useMemo(() => {
    if (selectedCity) {
      return {
        title: 'Temas del foco',
        subtitle: selectedCity.city,
        topics: selectedCity.topTopics,
      }
    }
    return {
      title: 'Temas dominantes',
      subtitle: 'Cobertura general',
      topics: buildTopTopics(currentPosts, 3),
    }
  }, [currentPosts, selectedCity])

  const totalPosts = currentStats.totalPosts || filteredPosts.length

  return (
    <main className='p-4 md:p-6 space-y-6 overflow-y-auto'>
      <SummaryGrid metrics={metrics} />
      <GeoPulse stats={pulseStats} />

      <ResizableHorizontalSplit
        storageKey='geo-tagging:map-intel'
        defaultRatio={0.62}
        minRatio={0.42}
        maxRatio={0.76}
        left={
          <div className='space-y-4 min-w-0'>
            <MapView
              posts={filteredPosts}
              showControls
              initialLayer='heatmap'
              activeCity={selectedCity}
              onCitySelect={setSelectedCity}
            />
          </div>
        }
        right={
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-1 min-w-0'>
            <GeoTerritoryIntel
              insights={locationInsights}
              totalPosts={totalPosts}
              selectedCity={selectedCity}
            />
            <GeoSentimentPanel
              insights={locationInsights}
              totals={currentStats.sentiments}
            />
            <GeoTopicsPanel
              title={topicsPanel.title}
              subtitle={topicsPanel.subtitle}
              topics={topicsPanel.topics}
            />
          </div>
        }
      />

      <GeoDrilldown
        insights={locationInsights}
        totalPosts={totalPosts}
        selectedCityId={selectedCity?.id}
        onSelectCity={setSelectedCity}
      />
    </main>
  )
}

export default GeoTaggingPage
