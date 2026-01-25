import { query } from '../db.js'
import { buildAlerts } from '../alertEngine.js'

const allowCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

const parseSingle = (value) => {
  if (Array.isArray(value)) return value[0]
  return value
}

const parseCount = (value) => {
  const parsed = Number.parseInt(parseSingle(value) ?? '7000', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 7000
  return Math.min(parsed, 10000)
}

const timeframeHours = {
  '24h': 24,
  '72h': 72,
  '7d': 24 * 7,
  '1m': 24 * 30,
  todo: 0,
}

const mapRows = (rows) =>
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

const filterPosts = (posts, filters, search) =>
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

const buildWindow = (posts, filters) => {
  if (!posts.length) {
    const now = new Date()
    return {
      currentPosts: [],
      prevPosts: [],
      windowStart: now,
      windowEnd: now,
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

  const inRange = (post, rangeStart, rangeEnd) => {
    const ts = new Date(post.timestamp).getTime()
    return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime()
  }

  return {
    currentPosts: posts.filter((post) => inRange(post, start, end)),
    prevPosts: posts.filter((post) => inRange(post, prevStart, prevEnd)),
    windowStart: start,
    windowEnd: end,
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

  const id = parseSingle(req.query?.id)
  if (!id) {
    res.status(400).json({ error: 'Missing alert id' })
    return
  }

  const count = parseCount(req.query?.count)
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
    const { currentPosts, prevPosts, windowStart, windowEnd } = buildWindow(matching, filters)
    const alerts = buildAlerts(currentPosts, prevPosts)
    const alert = alerts.find((item) => item.id === id)

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' })
      return
    }

    res.status(200).json({
      alert,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    })
  } catch (error) {
    console.error('DB error:', error)
    res.status(500).json({ error: 'Database query failed' })
  }
}
