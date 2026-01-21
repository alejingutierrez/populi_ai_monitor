import { useEffect, useMemo, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { type Filters } from "./components/FilterBar";
import Header from "./components/Header";
import MapView from "./components/MapView";
import PostFeed from "./components/PostFeed";
import Sidebar from "./components/Sidebar";
import SummaryGrid from "./components/SummaryGrid";
import TimelineChart from "./components/TimelineChart";
import TopicPanel, { type ClusterStat } from "./components/TopicPanel";
import { localPosts } from "./data/localPosts";
import type { SocialPost, TimelineDatum, Topic } from "./types";

const defaultFilters: Filters = {
  sentiment: "todos",
  platform: "todos",
  topic: "todos",
  timeframe: "todo",
  cluster: "todos",
  dateFrom: undefined,
  dateTo: undefined,
};

const buildSnapshot = (posts: SocialPost[]) => {
  const sentiments = { positivo: 0, neutral: 0, negativo: 0 };
  const topicCount: Record<string, number> = {};
  const cityCount: Record<string, number> = {};
  let positiveReach = 0;
  let neutralReach = 0;
  let negativeReach = 0;
  let sentimentWeightedScore = 0;
  let sentimentWeightTotal = 0;

  posts.forEach((post) => {
    sentiments[post.sentiment] += 1;
    topicCount[post.topic] = (topicCount[post.topic] ?? 0) + 1;
    cityCount[post.location.city] = (cityCount[post.location.city] ?? 0) + 1;
    const weight = post.reach > 0 ? post.reach : 1;
    const sentimentScore = post.sentiment === "positivo" ? 1 : post.sentiment === "neutral" ? 0.5 : 0;
    sentimentWeightedScore += sentimentScore * weight;
    sentimentWeightTotal += weight;
    if (post.sentiment === "positivo") positiveReach += weight;
    if (post.sentiment === "neutral") neutralReach += weight;
    if (post.sentiment === "negativo") negativeReach += weight;
  });

  const reach = posts.reduce((acc, p) => acc + p.reach, 0);
  const avgEngagement = posts.reduce((acc, p) => acc + p.engagement, 0) / (posts.length || 1);

  const topTopic = Object.entries(topicCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const topCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city);

  const sentimentIndex = sentimentWeightTotal ? (sentimentWeightedScore / sentimentWeightTotal) * 100 : 50;

  const reputationalRisk = (() => {
    if (!reach) return 0;
    const riskRaw = (negativeReach * 1.2 + neutralReach * 0.5 - positiveReach * 0.3) / reach;
    return Math.min(100, Math.max(0, riskRaw * 100));
  })();

  const polarization = (() => {
    const total = sentiments.positivo + sentiments.neutral + sentiments.negativo;
    if (!total) return 0;
    const shares = [sentiments.positivo / total, sentiments.neutral / total, sentiments.negativo / total];
    const baseline = 1 / 3;
    const spread = shares.reduce((acc, s) => acc + Math.abs(s - baseline), 0);
    const maxSpread = 4 / 3; // cuando una categoría domina
    return Math.min(100, (spread / maxSpread) * 100);
  })();

  const viralPropensity = (() => {
    const quantile = (arr: number[], q: number) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
    };
    const reachValues = posts.map((p) => p.reach);
    const engagementValues = posts.map((p) => p.engagement);
    const p90Reach = quantile(reachValues, 0.9);
    const p90Engagement = quantile(engagementValues, 0.9);
    const reachScore = p90Reach ? Math.min(1, (reach / (posts.length || 1)) / p90Reach) : 0;
    const engScore = p90Engagement ? Math.min(1, avgEngagement / p90Engagement) : 0;
    return Math.min(100, ((reachScore + engScore) / 2) * 100);
  })();

  return {
    totalPosts: posts.length,
    reach,
    avgEngagement,
    sentiments,
    topTopic,
    topCities,
    sentimentIndex,
    reputationalRisk,
    polarization,
    viralPropensity,
  };
};

const pctChange = (current: number, prev: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0;
  if (prev === 0) return current === 0 ? 0 : 100;
  return ((current - prev) / Math.abs(prev)) * 100;
};

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase) return envBase;
  if (typeof window === "undefined") return "/api";
  const { hostname, port } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (port === "4173") return "http://localhost:4001";
  if (isLocalhost) return "http://localhost:4000";
  return "/api";
};

function App() {
  const [posts, setPosts] = useState<SocialPost[]>(localPosts);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [apiBase] = useState(resolveApiBase());

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/posts`, { signal: controller.signal });
        if (!res.ok) throw new Error("No API");
        const data: SocialPost[] = await res.json();
        setPosts(data);
      } catch {
        // fallback to local data already set
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const topics = useMemo(
    () => Array.from(new Set(posts.map((p) => p.topic))) as Topic[],
    [posts]
  );

  const clusters = useMemo(
    () => Array.from(new Set(posts.map((p) => p.cluster))),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const hoursMap: Record<Filters["timeframe"], number> = {
      "24h": 24,
      "72h": 72,
      "7d": 24 * 7,
      "1m": 24 * 30,
      todo: Number.MAX_SAFE_INTEGER,
    };
    const cutoff = new Date(Date.now() - hoursMap[filters.timeframe] * 60 * 60 * 1000);
    const hasCustomRange = filters.dateFrom || filters.dateTo;
    const rangeFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    const rangeTo = filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : undefined;

    return posts
      .filter((post) => {
        const postDate = new Date(post.timestamp);
        if (filters.sentiment !== "todos" && post.sentiment !== filters.sentiment) return false;
        if (filters.platform !== "todos" && post.platform !== filters.platform) return false;
        if (filters.topic !== "todos" && post.topic !== filters.topic) return false;
        if (filters.cluster !== "todos" && post.cluster !== filters.cluster) return false;
        if (!hasCustomRange && filters.timeframe !== "todo" && postDate < cutoff) return false;
        if (hasCustomRange) {
          if (rangeFrom && postDate < rangeFrom) return false;
          if (rangeTo && postDate > rangeTo) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          const haystack = `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [posts, filters, search]);

  const metrics = useMemo(() => {
    const end = filteredPosts.reduce(
      (max, p) => Math.max(max, new Date(p.timestamp).getTime()),
      0
    );
    const endDate = end ? new Date(end) : new Date();
    const prevStart = new Date(endDate);
    prevStart.setDate(prevStart.getDate() - 14);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() - 14);

    const withinRange = (p: SocialPost, start: Date, finish: Date) => {
      const t = new Date(p.timestamp).getTime();
      return t >= start.getTime() && t <= finish.getTime();
    };

    const currentWindow = filteredPosts.filter((p) =>
      withinRange(p, prevStart, endDate)
    );
    const previousWindow = filteredPosts.filter((p) =>
      withinRange(p, prevEnd, prevStart)
    );

    const snapshot = buildSnapshot(filteredPosts);
    const currentSnapshot = buildSnapshot(currentWindow);
    const previousSnapshot = buildSnapshot(previousWindow);

    const deltas = {
      totalPct: pctChange(currentSnapshot.totalPosts, previousSnapshot.totalPosts),
      reachPct: pctChange(currentSnapshot.reach, previousSnapshot.reach),
      engagementPct: pctChange(
        currentSnapshot.avgEngagement,
        previousSnapshot.avgEngagement
      ),
      sentimentPct: pctChange(
        currentSnapshot.sentimentIndex,
        previousSnapshot.sentimentIndex
      ),
      reputationPct: pctChange(
        currentSnapshot.reputationalRisk,
        previousSnapshot.reputationalRisk
      ),
      polarizationPct: pctChange(
        currentSnapshot.polarization,
        previousSnapshot.polarization
      ),
      viralPropensityPct: pctChange(
        currentSnapshot.viralPropensity,
        previousSnapshot.viralPropensity
      ),
    };

    return {
      ...snapshot,
      deltas,
    };
  }, [filteredPosts]);

  const clusterStats: ClusterStat[] = useMemo(() => {
    const map = new Map<
      string,
      { positive: number; negative: number; volume: number }
    >();

    filteredPosts.forEach((post) => {
      const stats = map.get(post.cluster) ?? { positive: 0, negative: 0, volume: 0 };
      stats.volume += 1;
      if (post.sentiment === "positivo") stats.positive += 1;
      if (post.sentiment === "negativo") stats.negative += 1;
      map.set(post.cluster, stats);
    });

    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.volume - a.volume);
  }, [filteredPosts]);

  const timelineData = useMemo<TimelineDatum[]>(() => {
    if (!filteredPosts.length) return [];

    const timestamps = filteredPosts.map((p) => new Date(p.timestamp).getTime());
    const maxTs = Math.max(...timestamps);
    const minTs = Math.min(...timestamps);

    const dayMs = 24 * 60 * 60 * 1000;
    const hasRange = Boolean(filters.dateFrom || filters.dateTo);

    const end = filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : new Date(maxTs);

    const timeframeDays: Record<Filters["timeframe"], number> = {
      "24h": 1,
      "72h": 3,
      "7d": 7,
      "1m": 30,
      todo: Math.min(120, Math.ceil((maxTs - minTs) / dayMs) + 1),
    };

    let start: Date;
    if (hasRange && filters.dateFrom) {
      start = new Date(filters.dateFrom);
    } else {
      const days = timeframeDays[filters.timeframe] || 30;
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      if (filters.timeframe === "todo" && start.getTime() < minTs) {
        start = new Date(minTs);
      }
    }

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const bucketPosts = new Map<string, SocialPost[]>();

    filteredPosts.forEach((post) => {
      const d = new Date(post.timestamp);
      if (d < start || d > end) return;
      const key = dayKey(d);
      bucketPosts.set(key, [...(bucketPosts.get(key) ?? []), post]);
    });

    const series: TimelineDatum[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = dayKey(cursor);
      const snapshot = buildSnapshot(bucketPosts.get(key) ?? []);
      series.push({
        time: cursor.toLocaleDateString("es-PR", { month: "short", day: "numeric" }),
        publicaciones: snapshot.totalPosts,
        alcance: snapshot.reach,
        engagement: snapshot.avgEngagement,
        sentimentIndex: snapshot.sentimentIndex,
        reputationalRisk: snapshot.reputationalRisk,
        polarization: snapshot.polarization,
        viralPropensity: snapshot.viralPropensity,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return series;
  }, [filteredPosts, filters.dateFrom, filters.dateTo, filters.timeframe]);

  return (
    <div className="min-h-[100svh] h-[100dvh] overflow-hidden bg-gradient-to-br from-prWhite to-prGray flex text-ink">
      <Sidebar isOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          search={search}
          onSearch={setSearch}
          filters={filters}
          topics={topics}
          clusters={clusters}
          onFiltersChange={setFilters}
          onToggleNav={() => setNavOpen((prev) => !prev)}
        />
        <main className="p-4 md:p-6 space-y-6 overflow-y-auto">
          <SummaryGrid metrics={metrics} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TimelineChart data={timelineData} />
            <MapView posts={filteredPosts} />
            <PostFeed posts={filteredPosts} />
            <TopicPanel clusters={clusterStats} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
