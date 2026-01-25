import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { generateMockPosts } from "./mockData.js";
import { query } from "./db.js";
import { buildAlerts } from "./alertEngine.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/posts", async (req, res) => {
  const count = Math.min(Number.parseInt(req.query?.count ?? "7000", 10) || 7000, 10000);
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    const posts = generateMockPosts(7000).slice(0, count);
    res.json(posts);
    return;
  }

  try {
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
    `;
    const result = await query(sql, [count]);
    const posts = result.rows.map((row) => ({
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
    }));
    res.json(posts);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

const timeframeHours = {
  "24h": 24,
  "72h": 72,
  "7d": 24 * 7,
  "1m": 24 * 30,
  todo: 0,
};

const filterPosts = (posts, filters, search) =>
  posts.filter((post) => {
    if (filters.sentiment && filters.sentiment !== "todos" && post.sentiment !== filters.sentiment)
      return false;
    if (filters.platform && filters.platform !== "todos" && post.platform !== filters.platform)
      return false;
    if (filters.cluster && filters.cluster !== "todos" && post.cluster !== filters.cluster)
      return false;
    if (filters.subcluster && filters.subcluster !== "todos" && post.subcluster !== filters.subcluster)
      return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack =
        `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic} ${post.cluster} ${post.subcluster} ${post.microcluster}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

const buildWindow = (posts, filters) => {
  if (!posts.length) {
    const now = new Date();
    return { currentPosts: [], prevPosts: [], windowStart: now, windowEnd: now };
  }

  const timestamps = posts.map((post) => new Date(post.timestamp).getTime());
  const maxTs = Math.max(...timestamps);
  const minTs = Math.min(...timestamps);

  let start = new Date(minTs);
  let end = new Date(maxTs);

  if (filters.dateFrom || filters.dateTo) {
    start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(minTs);
    end = filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : new Date(maxTs);
  } else if (filters.timeframe && filters.timeframe !== "todo") {
    end = new Date(maxTs);
    start = new Date(end.getTime() - timeframeHours[filters.timeframe] * 60 * 60 * 1000);
  }

  const windowMs = Math.max(1, end.getTime() - start.getTime());
  const prevStart = new Date(start.getTime() - windowMs);
  const prevEnd = new Date(start.getTime());

  const inRange = (post, rangeStart, rangeEnd) => {
    const ts = new Date(post.timestamp).getTime();
    return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime();
  };

  return {
    currentPosts: posts.filter((post) => inRange(post, start, end)),
    prevPosts: posts.filter((post) => inRange(post, prevStart, prevEnd)),
    windowStart: start,
    windowEnd: end,
  };
};

const loadPosts = async (count) => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    return generateMockPosts(7000).slice(0, count);
  }
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
  `;
  const result = await query(sql, [count]);
  return result.rows.map((row) => ({
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
  }));
};

app.get("/alerts", async (req, res) => {
  const count = Math.min(Number.parseInt(req.query?.count ?? "7000", 10) || 7000, 10000);
  try {
    const posts = await loadPosts(count);
    const filters = {
      sentiment: req.query?.sentiment,
      platform: req.query?.platform,
      cluster: req.query?.cluster,
      subcluster: req.query?.subcluster,
      timeframe: req.query?.timeframe ?? "todo",
      dateFrom: req.query?.dateFrom,
      dateTo: req.query?.dateTo,
    };
    const search = req.query?.search ?? "";
    const matching = filterPosts(posts, filters, search);
    const { currentPosts, prevPosts, windowStart, windowEnd } = buildWindow(matching, filters);
    const alerts = buildAlerts(currentPosts, prevPosts);
    res.json({
      alerts,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.get("/alerts/:id", async (req, res) => {
  const count = Math.min(Number.parseInt(req.query?.count ?? "7000", 10) || 7000, 10000);
  try {
    const posts = await loadPosts(count);
    const filters = {
      sentiment: req.query?.sentiment,
      platform: req.query?.platform,
      cluster: req.query?.cluster,
      subcluster: req.query?.subcluster,
      timeframe: req.query?.timeframe ?? "todo",
      dateFrom: req.query?.dateFrom,
      dateTo: req.query?.dateTo,
    };
    const search = req.query?.search ?? "";
    const matching = filterPosts(posts, filters, search);
    const { currentPosts, prevPosts, windowStart, windowEnd } = buildWindow(matching, filters);
    const alerts = buildAlerts(currentPosts, prevPosts);
    const alert = alerts.find((item) => item.id === req.params.id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.json({
      alert,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.post("/alerts/:id/actions", (req, res) => {
  res.json({ status: "ok", id: req.params.id, action: req.body?.action ?? "ack" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Mock API lista en puerto ${port}`);
});
