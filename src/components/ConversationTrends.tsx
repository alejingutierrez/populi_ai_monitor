import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, type FC } from "react";
import type { SocialPost } from "../types";
import type { Filters } from "./FilterBar";

interface Props {
  allPosts: SocialPost[];
  filters: Filters;
  search: string;
}

type WindowKey = "24h" | "7d";

const hoursByWindow: Record<WindowKey, number> = {
  "24h": 24,
  "7d": 24 * 7,
};

const ConversationTrends: FC<Props> = ({ allPosts, filters, search }) => {
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const isDateConstrained = filters.timeframe !== "todo" || Boolean(filters.dateFrom || filters.dateTo);

  const trendData = useMemo(() => {
    if (!allPosts.length) {
      return {
        rangeLabel: "Sin datos",
        totalCurrent: 0,
        totalPrev: 0,
        topTopic: "N/A",
        topics: [] as {
          name: string;
          current: number;
          previous: number;
          deltaPct: number;
        }[],
        maxCount: 0,
      };
    }

    const now = new Date();
    const allTimestamps = allPosts.map((post) => new Date(post.timestamp).getTime());
    const maxTs = allTimestamps.length ? Math.max(...allTimestamps) : now.getTime();

    const matchesNonDateFilters = (post: SocialPost) => {
      if (filters.sentiment !== "todos" && post.sentiment !== filters.sentiment) return false;
      if (filters.platform !== "todos" && post.platform !== filters.platform) return false;
      if (filters.cluster !== "todos" && post.cluster !== filters.cluster) return false;
      if (filters.subcluster !== "todos" && post.subcluster !== filters.subcluster) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack =
          `${post.content} ${post.author} ${post.handle} ${post.location.city} ${post.topic} ${post.cluster} ${post.subcluster} ${post.microcluster}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    };

    const allMatching = allPosts.filter(matchesNonDateFilters);
    const matchingTimestamps = allMatching.map((post) => new Date(post.timestamp).getTime());
    const matchingMin = matchingTimestamps.length ? Math.min(...matchingTimestamps) : maxTs;
    const matchingMax = matchingTimestamps.length ? Math.max(...matchingTimestamps) : maxTs;

    const timeframeHours: Record<Filters["timeframe"], number> = {
      "24h": 24,
      "72h": 72,
      "7d": 24 * 7,
      "1m": 24 * 30,
      todo: 0,
    };

    const resolveRange = () => {
      if (filters.dateFrom || filters.dateTo) {
        const start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(matchingMin);
        const end = filters.dateTo
          ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
          : new Date(matchingMax);
        return { start, end, label: `${start.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}` };
      }

      if (filters.timeframe !== "todo") {
        const hours = timeframeHours[filters.timeframe];
        const end = now;
        const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
        return {
          start,
          end,
          label: `${start.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}`,
        };
      }

      const hours = hoursByWindow[windowKey];
      const end = new Date(maxTs);
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      return {
        start,
        end,
        label: `${start.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}`,
      };
    };

    const { start, end, label } = resolveRange();
    const windowMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - windowMs);

    const currentMap = new Map<string, number>();
    const prevMap = new Map<string, number>();

    allMatching.forEach((post) => {
      const ts = new Date(post.timestamp).getTime();
      if (ts >= start.getTime() && ts <= end.getTime()) {
        currentMap.set(post.topic, (currentMap.get(post.topic) ?? 0) + 1);
      } else if (ts >= prevStart.getTime() && ts < start.getTime()) {
        prevMap.set(post.topic, (prevMap.get(post.topic) ?? 0) + 1);
      }
    });

    const topics = Array.from(currentMap.entries()).map(([name, count]) => {
      const prev = prevMap.get(name) ?? 0;
      const deltaPct = prev ? ((count - prev) / prev) * 100 : count ? 100 : 0;
      return { name, current: count, previous: prev, deltaPct };
    });

    topics.sort((a, b) => b.current - a.current);

    const totalCurrent = topics.reduce((acc, item) => acc + item.current, 0);
    const totalPrev = Array.from(prevMap.values()).reduce((acc, value) => acc + value, 0);
    const topTopic = topics[0]?.name ?? "N/A";
    const maxCount = topics[0]?.current ?? 0;

    return {
      rangeLabel: label,
      totalCurrent,
      totalPrev,
      topTopic,
      topics,
      maxCount,
    };
  }, [allPosts, filters, search, windowKey]);

  const totalDelta =
    trendData.totalPrev === 0
      ? trendData.totalCurrent
      : ((trendData.totalCurrent - trendData.totalPrev) / trendData.totalPrev) * 100;
  const totalUp = totalDelta >= 0;
  const totalDeltaLabel = `${totalUp ? "+" : ""}${totalDelta.toFixed(1)}%`;

  return (
    <section className="card p-4">
      <div className="card-header">
        <div>
          <p className="muted">Overview</p>
          <p className="h-section">Tendencias de conversación</p>
          <p className="text-xs text-slate-500 mt-1">{trendData.rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {isDateConstrained ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Filtro global activo
            </span>
          ) : (
            (["24h", "7d"] as WindowKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setWindowKey(key)}
                className={`h-9 px-3 rounded-xl text-xs font-semibold border transition ${
                  windowKey === key
                    ? "bg-prBlue text-white border-prBlue"
                    : "bg-white text-slate-700 border-slate-200 hover:border-prBlue"
                }`}
              >
                {key === "24h" ? "24h" : "7 días"}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
            Volumen total
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-3xl font-semibold text-ink">
              {trendData.totalCurrent.toLocaleString("es-PR")}
            </p>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                totalUp
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {totalUp ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
              {totalDeltaLabel}
            </span>
          </div>
          <div className="mt-4 text-xs text-slate-600 space-y-2">
            <p>
              Top tema: <span className="font-semibold text-ink">{trendData.topTopic}</span>
            </p>
            <p>
              Comparativa previa: {trendData.totalPrev.toLocaleString("es-PR")} menciones
            </p>
            <p>
              Ventana analizada: {windowKey === "24h" ? "últimas 24 horas" : "últimos 7 días"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {trendData.topics.slice(0, 6).map((topic) => {
            const pct = trendData.maxCount ? (topic.current / trendData.maxCount) * 100 : 0;
            const deltaUp = topic.deltaPct >= 0;
            return (
              <div
                key={topic.name}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-ink">
                  <span>{topic.name}</span>
                  <span className="text-xs text-slate-500">
                    {topic.current.toLocaleString("es-PR")}
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-prBlue to-prRed"
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{topic.previous.toLocaleString("es-PR")} previas</span>
                  <span
                    className={`font-semibold ${
                      deltaUp ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {deltaUp ? "+" : ""}
                    {topic.deltaPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
          {trendData.topics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
              Sin datos suficientes para mostrar tendencias.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ConversationTrends;
