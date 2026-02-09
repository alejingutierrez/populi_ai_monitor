import type { Sentiment, SocialPost } from '../types'

export type CityInsight = {
  id: string
  city: string
  lat: number
  lng: number
  total: number
  reach: number
  engagement: number
  engagementRate: number
  sentiments: Record<Sentiment, number>
  sentimentIndex: number
  riskScore: number
  topTopics: { name: string; count: number }[]
  lastDayCount: number
  prevDayCount: number
  timeWindow: { from?: Date; to?: Date }
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

export const dominantSentiment = (sentiments: Record<Sentiment, number>) => {
  const entries = Object.entries(sentiments) as [Sentiment, number][]
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
}

export const calcSentimentIndex = (posts: SocialPost[]) => {
  let weightedScore = 0
  let weightedTotal = 0
  posts.forEach((post) => {
    const weight = post.reach > 0 ? post.reach : 1
    const score = post.sentiment === 'positivo' ? 1 : post.sentiment === 'neutral' ? 0.5 : 0
    weightedScore += score * weight
    weightedTotal += weight
  })
  return weightedTotal ? (weightedScore / weightedTotal) * 100 : 0
}

export const calcRiskScore = (posts: SocialPost[]) => {
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

export const buildLocationInsights = (posts: SocialPost[]): CityInsight[] => {
  if (!posts.length) return []

  const windowFrom = new Date(
    Math.min(...posts.map((p) => new Date(p.timestamp).getTime()))
  )
  const windowTo = new Date(
    Math.max(...posts.map((p) => new Date(p.timestamp).getTime()))
  )

  const buckets = new Map<string, SocialPost[]>()
  posts.forEach((post) => {
    const { lat, lng } = post.location
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const key = `${post.location.city}-${lat}-${lng}`
    buckets.set(key, [...(buckets.get(key) ?? []), post])
  })

  return Array.from(buckets.entries())
    .map(([key, bucket]): CityInsight | null => {
      const sentiments: Record<Sentiment, number> = {
        positivo: 0,
        neutral: 0,
        negativo: 0,
      }
      const topicCount = new Map<string, number>()
      let reach = 0
      let engagement = 0

      bucket.forEach((post) => {
        sentiments[post.sentiment] += 1
        topicCount.set(post.topic, (topicCount.get(post.topic) ?? 0) + 1)
        reach += post.reach
        engagement += post.engagement
      })

      const topTopics = Array.from(topicCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

      const dayCounts = new Map<string, number>()
      bucket.forEach((post) => {
        const key = dayKey(new Date(post.timestamp))
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
      })
      const dayKeys = Array.from(dayCounts.keys()).sort()
      const lastDayKey = dayKeys.length ? dayKeys[dayKeys.length - 1] : undefined
      const prevDayKey = dayKeys.length > 1 ? dayKeys[dayKeys.length - 2] : undefined

      const loc = bucket[0].location
      const lat = loc.lat
      const lng = loc.lng
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      const engagementRate = reach ? (engagement / reach) * 100 : 0
      const sentimentIndex = calcSentimentIndex(bucket)
      const riskScore = calcRiskScore(bucket)

      return {
        id: key,
        city: loc.city,
        lat,
        lng,
        total: bucket.length,
        reach,
        engagement,
        engagementRate,
        sentiments,
        sentimentIndex,
        riskScore,
        topTopics,
        lastDayCount: lastDayKey ? dayCounts.get(lastDayKey) ?? 0 : bucket.length,
        prevDayCount: prevDayKey ? dayCounts.get(prevDayKey) ?? 0 : 0,
        timeWindow: { from: windowFrom, to: windowTo },
      }
    })
    .filter((insight): insight is CityInsight => Boolean(insight))
    .sort((a, b) => b.total - a.total)
}
