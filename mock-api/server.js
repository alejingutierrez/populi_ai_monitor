import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { generateMockPosts } from "./mockData.js";
import { query } from "./db.js";
import { buildAlerts, buildAlertRuleStats, defaultAlertThresholds } from "./alertEngine.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const normalizeSentiment = (value) => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "positive" || raw === "positivo") return "positivo";
  if (raw === "negative" || raw === "negativo") return "negativo";
  return "neutral";
};

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
        coalesce(pl.display_name, p.platform_id, p.content_source_name, p.content_source) as platform,
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
        coalesce(l.city, p.city, p.location_name) as city,
        coalesce(l.lat, p.latitude) as lat,
        coalesce(l.lng, p.longitude) as lng,
        p.url,
        p.domain,
        p.language
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
      author: row.author ?? "Sin autor",
      handle: row.handle ?? "",
      platform: row.platform ?? "Sin plataforma",
      content: row.content ?? "",
      sentiment: normalizeSentiment(row.sentiment),
      topic: row.topic ?? "Sin tema",
      timestamp: row.timestamp,
      reach: row.reach ?? 0,
      engagement: row.engagement ?? 0,
      mediaType: row.mediaType ?? "texto",
      cluster: row.cluster ?? "Sin cluster",
      subcluster: row.subcluster ?? "Sin subcluster",
      microcluster: row.microcluster ?? "Sin microcluster",
      location: {
        city: row.city ?? "Sin ubicación",
        lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
        lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
      },
      url: row.url ?? undefined,
      domain: row.domain ?? undefined,
      language: row.language ?? undefined,
    }));
    res.json(posts);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

const alertStateStore = new Map();
const alertActionStore = new Map();

const timeframeHours = {
  "24h": 24,
  "72h": 72,
  "7d": 24 * 7,
  "1m": 24 * 30,
  todo: 0,
};

const parseSingle = (value) => (Array.isArray(value) ? value[0] : value);

const parseList = (value) => {
  const single = parseSingle(value);
  if (!single) return [];
  return String(single)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseCount = (value) => {
  const parsed = Number.parseInt(parseSingle(value) ?? "7000", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7000;
  return Math.min(parsed, 10000);
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(parseSingle(value) ?? "32", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 32;
  return Math.min(parsed, 200);
};

const parseCursor = (value) => {
  const raw = parseSingle(value);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const formatRange = (start, end) =>
  `${start.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${end.toLocaleDateString(
    "es-PR",
    { month: "short", day: "numeric" }
  )}`;

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
    };
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
  const prevPrevStart = new Date(prevStart.getTime() - windowMs);
  const prevPrevEnd = new Date(prevStart.getTime());

  const inRange = (post, rangeStart, rangeEnd) => {
    const ts = new Date(post.timestamp).getTime();
    return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime();
  };

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
  };
};

const dayKey = (date) => date.toISOString().slice(0, 10);

const buildAlertTimeline = (alerts, start, end) => {
  const points = new Map();
  const cursor = new Date(start);

  while (cursor <= end) {
    const key = dayKey(cursor);
    points.set(key, {
      day: cursor.toLocaleDateString("es-PR", { month: "short", day: "numeric" }),
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  alerts.forEach((alert) => {
    const key = dayKey(new Date(alert.lastSeenAt));
    const point = points.get(key);
    if (!point) return;
    point.total += 1;
    point[alert.severity] += 1;
  });

  return Array.from(points.values());
};

const pctChange = (current, prev) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0;
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / Math.abs(prev)) * 100;
};

const calcSlaHours = (alerts, referenceTime) => {
  if (!alerts.length) return 0;
  const totalHours = alerts.reduce((acc, alert) => {
    const createdAt = new Date(alert.createdAt).getTime();
    const diff = Math.max(0, referenceTime - createdAt);
    return acc + diff / (1000 * 60 * 60);
  }, 0);
  return totalHours / Math.max(1, alerts.length);
};

const buildPulseStats = (alerts, prevAlerts, rangeLabel, windowEnd, prevWindowEnd) => {
  const openAlerts = alerts.filter((alert) => alert.status === "open");
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const investigatingAlerts = alerts.filter(
    (alert) => alert.status === "ack" || alert.status === "escalated"
  );
  const slaHours = calcSlaHours(openAlerts, windowEnd.getTime());

  const prevOpen = prevAlerts.length;
  const prevCritical = prevAlerts.filter((alert) => alert.severity === "critical").length;
  const prevInvestigating = prevAlerts.filter(
    (alert) => alert.status === "ack" || alert.status === "escalated"
  ).length;
  const prevSla = calcSlaHours(prevAlerts, prevWindowEnd.getTime());

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
  };
};

const buildBaselineStats = (alerts, referenceTime) => {
  const openAlerts = alerts.filter((alert) => alert.status === "open");
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const investigatingAlerts = alerts.filter(
    (alert) => alert.status === "ack" || alert.status === "escalated"
  );
  return {
    openCount: openAlerts.length,
    criticalCount: criticalAlerts.length,
    investigatingCount: investigatingAlerts.length,
    slaHours: calcSlaHours(openAlerts, referenceTime.getTime()),
  };
};

const severityWeight = (severity) => {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
};

const sortAlerts = (alerts, sortKey) => {
  if (!sortKey || sortKey === "score") return alerts;
  const sorted = [...alerts];
  if (sortKey === "severity") {
    return sorted.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  }
  if (sortKey === "priority") {
    return sorted.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  if (sortKey === "recent") {
    return sorted.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
  }
  if (sortKey === "volume") {
    return sorted.sort((a, b) => b.metrics.volumeCurrent - a.metrics.volumeCurrent);
  }
  if (sortKey === "risk") {
    return sorted.sort((a, b) => b.metrics.riskScore - a.metrics.riskScore);
  }
  if (sortKey === "impact") {
    return sorted.sort((a, b) => b.metrics.impactRatio - a.metrics.impactRatio);
  }
  return alerts;
};

const sortRelated = (alerts, sortKey) => {
  if (!sortKey || sortKey === "score") return alerts;
  const sorted = [...alerts];
  if (sortKey === "severity") {
    return sorted.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
  }
  if (sortKey === "recent") {
    return sorted.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
  }
  return alerts;
};

const mergePersistedState = (alerts) =>
  alerts.map((alert) => {
    const persisted = alertStateStore.get(alert.id);
    if (!persisted) return alert;
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
    };
  });

const loadPosts = async (count) => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    return generateMockPosts(7000).slice(0, count);
  }
  const sql = `
    select
      p.id,
      p.author,
      p.handle,
      coalesce(pl.display_name, p.platform_id, p.content_source_name, p.content_source) as platform,
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
      coalesce(l.city, p.city, p.location_name) as city,
      coalesce(l.lat, p.latitude) as lat,
      coalesce(l.lng, p.longitude) as lng,
      p.url,
      p.domain,
      p.language
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
    author: row.author ?? "Sin autor",
    handle: row.handle ?? "",
    platform: row.platform ?? "Sin plataforma",
    content: row.content ?? "",
    sentiment: normalizeSentiment(row.sentiment),
    topic: row.topic ?? "Sin tema",
    timestamp: row.timestamp,
    reach: row.reach ?? 0,
    engagement: row.engagement ?? 0,
    mediaType: row.mediaType ?? "texto",
    cluster: row.cluster ?? "Sin cluster",
    subcluster: row.subcluster ?? "Sin subcluster",
    microcluster: row.microcluster ?? "Sin microcluster",
    location: {
      city: row.city ?? "Sin ubicación",
      lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
      lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    },
    url: row.url ?? undefined,
    domain: row.domain ?? undefined,
    language: row.language ?? undefined,
  }));
};

app.get("/alerts", async (req, res) => {
  const count = parseCount(req.query?.count);
  const limit = parseLimit(req.query?.limit);
  const cursor = parseCursor(req.query?.cursor);
  const sort = parseSingle(req.query?.sort) ?? "score";
  const severityFilter = parseList(req.query?.severity);
  const statusFilter = parseList(req.query?.status);

  try {
    const posts = await loadPosts(count);
    const filters = {
      sentiment: parseSingle(req.query?.sentiment),
      platform: parseSingle(req.query?.platform),
      cluster: parseSingle(req.query?.cluster),
      subcluster: parseSingle(req.query?.subcluster),
      timeframe: parseSingle(req.query?.timeframe) ?? "todo",
      dateFrom: parseSingle(req.query?.dateFrom),
      dateTo: parseSingle(req.query?.dateTo),
    };
    const search = parseSingle(req.query?.search) ?? "";
    const matching = filterPosts(posts, filters, search);
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
    } = buildWindow(matching, filters);
    let alerts = buildAlerts(currentPosts, prevPosts);
    const prevAlerts = buildAlerts(prevPosts, prevPrevPosts);

    alerts = mergePersistedState(alerts);

    const applyFilters = (list) =>
      list.filter((alert) => {
        if (severityFilter.length && !severityFilter.includes(alert.severity)) return false;
        if (statusFilter.length && !statusFilter.includes(alert.status)) return false;
        return true;
      });

    const filteredAlerts = applyFilters(alerts);
    const filteredPrevAlerts = applyFilters(prevAlerts);

    const rangeLabel = formatRange(windowStart, windowEnd);
    const pulseStats = buildPulseStats(
      filteredAlerts,
      filteredPrevAlerts,
      rangeLabel,
      windowEnd,
      prevWindowEnd
    );
    const baselineStats = buildBaselineStats(filteredPrevAlerts, prevWindowEnd);
    const timeline = buildAlertTimeline(filteredAlerts, windowStart, windowEnd);
    const rules = buildAlertRuleStats(filteredAlerts, defaultAlertThresholds);

    const sortedAlerts = sortAlerts(filteredAlerts, sort);
    const pagedAlerts = sortedAlerts.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < sortedAlerts.length ? String(cursor + limit) : null;

    res.json({
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
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.get("/alerts/:id", async (req, res) => {
  const count = parseCount(req.query?.count);
  const sort = parseSingle(req.query?.sort) ?? "score";
  const severityFilter = parseList(req.query?.severity);
  const statusFilter = parseList(req.query?.status);
  try {
    const posts = await loadPosts(count);
    const filters = {
      sentiment: parseSingle(req.query?.sentiment),
      platform: parseSingle(req.query?.platform),
      cluster: parseSingle(req.query?.cluster),
      subcluster: parseSingle(req.query?.subcluster),
      timeframe: parseSingle(req.query?.timeframe) ?? "todo",
      dateFrom: parseSingle(req.query?.dateFrom),
      dateTo: parseSingle(req.query?.dateTo),
    };
    const search = parseSingle(req.query?.search) ?? "";
    const matching = filterPosts(posts, filters, search);
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
    } = buildWindow(matching, filters);
    let alerts = buildAlerts(currentPosts, prevPosts);
    const prevAlerts = buildAlerts(prevPosts, prevPrevPosts);

    alerts = mergePersistedState(alerts);

    const applyFilters = (list) =>
      list.filter((item) => {
        if (severityFilter.length && !severityFilter.includes(item.severity)) return false;
        if (statusFilter.length && !statusFilter.includes(item.status)) return false;
        return true;
      });

    const filteredAlerts = applyFilters(alerts);
    const filteredPrevAlerts = applyFilters(prevAlerts);
    const alert = filteredAlerts.find((item) => item.id === req.params.id);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const relatedAlerts = sortRelated(
      filteredAlerts.filter((item) => {
        if (item.id === alert.id) return false;
        if (item.scopeType === alert.scopeType) return true;
        if (item.parentScopeId && item.parentScopeId === alert.scopeId) return true;
        if (alert.parentScopeId && item.scopeId === alert.parentScopeId) return true;
        return false;
      }),
      sort
    ).slice(0, 6);

    const rangeLabel = formatRange(windowStart, windowEnd);
    const pulseStats = buildPulseStats(
      filteredAlerts,
      filteredPrevAlerts,
      rangeLabel,
      windowEnd,
      prevWindowEnd
    );
    const baselineStats = buildBaselineStats(filteredPrevAlerts, prevWindowEnd);
    const timeline = buildAlertTimeline(filteredAlerts, windowStart, windowEnd);
    const rules = buildAlertRuleStats(filteredAlerts, defaultAlertThresholds);

    const history = [];
    const prevMatch = filteredPrevAlerts.find((item) => item.id === req.params.id);
    if (prevMatch) {
      history.push({
        windowStart: prevWindowStart.toISOString(),
        windowEnd: prevWindowEnd.toISOString(),
        severity: prevMatch.severity,
        status: prevMatch.status,
        metrics: prevMatch.metrics,
        signals: prevMatch.signals,
      });
    }
    history.push({
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      severity: alert.severity,
      status: alert.status,
      metrics: alert.metrics,
      signals: alert.signals,
    });

    res.json({
      alert,
      history,
      relatedAlerts,
      pulseStats,
      baselineStats,
      timeline,
      rules,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
      prevWindow: { start: prevWindowStart.toISOString(), end: prevWindowEnd.toISOString() },
      baseline: { start: baselineStart.toISOString(), end: baselineEnd.toISOString() },
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.post("/alerts/:id/actions", (req, res) => {
  const rawAction = parseSingle(req.body?.action) ?? "ack";
  const actionMap = {
    ack: "ack",
    acknowledge: "ack",
    snooze: "snoozed",
    snoozed: "snoozed",
    resolve: "resolved",
    resolved: "resolved",
    escalate: "escalated",
    escalated: "escalated",
    reopen: "open",
    open: "open",
  };
  const action = actionMap[rawAction] ?? "ack";
  const id = req.params.id;
  const actor = parseSingle(req.body?.actor);
  const note = parseSingle(req.body?.note);
  const snoozeUntilInput = parseSingle(req.body?.snoozeUntil);
  const snapshot = req.body?.alert ?? req.body?.snapshot ?? null;

  const now = new Date();
  const nowIso = now.toISOString();
  const clearTimers = action === "open";
  let snoozeUntil = null;
  if (action === "snoozed") {
    const fallback = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const candidate = snoozeUntilInput ? new Date(snoozeUntilInput) : fallback;
    snoozeUntil = Number.isNaN(candidate.getTime()) ? fallback.toISOString() : candidate.toISOString();
  }

  const previous = alertStateStore.get(id) ?? {};
  const updated = {
    ...previous,
    status: action,
    lastStatusAt: nowIso,
    ackAt: clearTimers ? null : action === "ack" ? nowIso : previous.ackAt ?? null,
    resolvedAt: clearTimers ? null : action === "resolved" ? nowIso : previous.resolvedAt ?? null,
    snoozeUntil: clearTimers ? null : snoozeUntil ?? previous.snoozeUntil ?? null,
    owner: snapshot?.owner ?? previous.owner ?? null,
    team: snapshot?.team ?? previous.team ?? null,
    assignee: snapshot?.assignee ?? previous.assignee ?? null,
    priority: Number.isFinite(snapshot?.priority) ? snapshot.priority : previous.priority ?? null,
    severity: snapshot?.severity ?? previous.severity ?? null,
  };

  alertStateStore.set(id, updated);

  const actions = alertActionStore.get(id) ?? [];
  actions.push({
    id: `action-${actions.length + 1}`,
    action,
    actor: actor ?? null,
    note: note ?? null,
    createdAt: nowIso,
  });
  alertActionStore.set(id, actions);

  res.json({ status: "ok", id, action, updated, createdAt: nowIso });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Mock API lista en puerto ${port}`);
});
