import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useMemo, type FC } from "react";
import type { SocialPost, TimelineDatum } from "../types";
import type { Filters } from "./FilterBar";

interface TrendItem {
  name: string;
  current: number;
  previous: number;
  deltaPct: number;
}

interface Props {
  posts: SocialPost[];
  filters: Filters;
  timelineData: TimelineDatum[];
}

const formatRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString("es-PR", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("es-PR", { month: "short", day: "numeric" })}`;

const TrendRadar: FC<Props> = ({ posts, filters, timelineData }) => {
  const trendData = useMemo(() => {
    if (!posts.length) {
      return {
        rangeLabel: "Sin datos",
        totalCurrent: 0,
        totalPrev: 0,
        topTopics: [] as TrendItem[],
        topClusters: [] as TrendItem[],
        topAuthors: [] as { name: string; count: number }[],
        sentimentShare: { positivo: 0, neutral: 0, negativo: 0 },
      };
    }

    const timestamps = posts.map((post) => new Date(post.timestamp).getTime());
    const maxTs = Math.max(...timestamps);
    const minTs = Math.min(...timestamps);

    const timeframeHours: Record<Filters["timeframe"], number> = {
      "24h": 24,
      "72h": 72,
      "7d": 24 * 7,
      "1m": 24 * 30,
      todo: 0,
    };

    let start = new Date(minTs);
    let end = new Date(maxTs);
    if (filters.dateFrom || filters.dateTo) {
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(minTs);
      end = filters.dateTo
        ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
        : new Date(maxTs);
    } else if (filters.timeframe !== "todo") {
      end = new Date(maxTs);
      start = new Date(end.getTime() - timeframeHours[filters.timeframe] * 60 * 60 * 1000);
    }

    const windowMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - windowMs);

    const topicMap = new Map<string, { current: number; prev: number }>();
    const clusterMap = new Map<string, { current: number; prev: number }>();
    const sentimentCount = { positivo: 0, neutral: 0, negativo: 0 };
    const authorMap = new Map<string, number>();

    posts.forEach((post) => {
      const ts = new Date(post.timestamp).getTime();
      const isCurrent = ts >= start.getTime() && ts <= end.getTime();
      const isPrev = ts >= prevStart.getTime() && ts < start.getTime();

      if (isCurrent) {
        sentimentCount[post.sentiment] += 1;
      }

      const updateMap = (map: Map<string, { current: number; prev: number }>, key: string) => {
        const entry = map.get(key) ?? { current: 0, prev: 0 };
        if (isCurrent) entry.current += 1;
        if (isPrev) entry.prev += 1;
        map.set(key, entry);
      };

      updateMap(topicMap, post.topic);
      updateMap(clusterMap, post.cluster);
      if (isCurrent) {
        authorMap.set(post.author, (authorMap.get(post.author) ?? 0) + 1);
      }
    });

    const toTrendItems = (map: Map<string, { current: number; prev: number }>) =>
      Array.from(map.entries())
        .map(([name, counts]) => {
          const deltaPct = counts.prev ? ((counts.current - counts.prev) / counts.prev) * 100 : counts.current ? 100 : 0;
          return { name, current: counts.current, previous: counts.prev, deltaPct };
        })
        .sort((a, b) => b.current - a.current);

    const totalCurrent = Array.from(topicMap.values()).reduce((acc, v) => acc + v.current, 0);
    const totalPrev = Array.from(topicMap.values()).reduce((acc, v) => acc + v.prev, 0);

    return {
      rangeLabel: formatRange(start, end),
      totalCurrent,
      totalPrev,
      topTopics: toTrendItems(topicMap).slice(0, 5),
      topClusters: toTrendItems(clusterMap).slice(0, 5),
      topAuthors: Array.from(authorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count })),
      sentimentShare: sentimentCount,
    };
  }, [filters.dateFrom, filters.dateTo, filters.timeframe, posts]);

  const totalDelta = trendData.totalPrev
    ? ((trendData.totalCurrent - trendData.totalPrev) / trendData.totalPrev) * 100
    : trendData.totalCurrent;
  const totalUp = totalDelta >= 0;

  const sparkline = useMemo(() => {
    if (!timelineData.length) return [] as number[];
    const slice = timelineData.slice(-12);
    const max = Math.max(...slice.map((item) => item.publicaciones));
    return slice.map((item) => (max ? (item.publicaciones / max) * 100 : 0));
  }, [timelineData]);

  const sentimentTotal = Object.values(trendData.sentimentShare).reduce((a, b) => a + b, 0) || 1;
  const negativeShare = (trendData.sentimentShare.negativo / sentimentTotal) * 100;
  const topTopic = trendData.topTopics[0];
  const topCluster = trendData.topClusters[0];
  const alerts = [
    totalDelta >= 20 ? "Crecimiento acelerado de volumen" : null,
    negativeShare >= 35 ? "Sentimiento negativo por encima del 35%" : null,
    topCluster && Math.abs(topCluster.deltaPct) >= 40
      ? `Cluster ${topCluster.name} con variacion ${topCluster.deltaPct.toFixed(0)}%`
      : null,
  ].filter(Boolean) as string[];

  return (
    <section className="card p-4 h-full flex flex-col min-h-[320px]">
      <div className="card-header items-start gap-4 flex-col lg:flex-row lg:items-center">
        <div>
          <p className="muted">Feed Stream</p>
          <p className="h-section">Trend radar</p>
          <p className="text-xs text-slate-500 mt-1">{trendData.rangeLabel}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
          Ventana comparativa
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-inner space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Volumen actual</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                totalUp ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {totalUp ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />}
              {`${totalUp ? "+" : ""}${totalDelta.toFixed(1)}%`}
            </span>
          </div>
          <p className="text-3xl font-semibold text-ink">{trendData.totalCurrent.toLocaleString("es-PR")}</p>

          <div className="flex items-end gap-1 h-12">
            {sparkline.map((height, index) => (
              <span
                key={`spark-${index}`}
                className="flex-1 rounded-full bg-prBlue/70"
                style={{ height: `${Math.max(8, height)}%` }}
              />
            ))}
            {!sparkline.length ? (
              <span className="text-xs text-slate-400">Sin serie para sparkline.</span>
            ) : null}
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>Comparativa previa: {trendData.totalPrev.toLocaleString("es-PR")} menciones</p>
            <p>Sentimiento negativo actual: {negativeShare.toFixed(0)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">IA observa</p>
            </div>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              <li>
                {topTopic
                  ? `Tema dominante: ${topTopic.name} (${topTopic.current.toLocaleString("es-PR")} menciones).`
                  : "Sin temas dominantes todavía."}
              </li>
              <li>
                {topCluster
                  ? `Cluster líder: ${topCluster.name} con ${topCluster.current.toLocaleString("es-PR")} menciones.`
                  : "Sin clusters destacados."}
              </li>
              <li>
                {negativeShare > 35
                  ? "Riesgo potencial: sentimiento crítico supera el 35% en la ventana actual."
                  : "Pulso estable: sentimiento crítico bajo control en esta ventana."}
              </li>
            </ul>
            {alerts.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                {alerts.map((alert) => (
                  <span
                    key={alert}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700"
                  >
                    {alert}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-slate-500">
                Sin alertas criticas en esta ventana.
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">Top temas</p>
              <div className="mt-2 space-y-2">
                {trendData.topTopics.map((topic) => {
                  const up = topic.deltaPct >= 0;
                  return (
                    <div key={topic.name} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{topic.name}</span>
                      <span className={up ? "text-emerald-600" : "text-rose-600"}>
                        {up ? "+" : ""}
                        {topic.deltaPct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
                {!trendData.topTopics.length ? (
                  <p className="text-xs text-slate-500">Sin datos de temas.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">Top clusters</p>
              <div className="mt-2 space-y-2">
                {trendData.topClusters.map((cluster) => {
                  const up = cluster.deltaPct >= 0;
                  return (
                    <div key={cluster.name} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{cluster.name}</span>
                      <span className={up ? "text-emerald-600" : "text-rose-600"}>
                        {up ? "+" : ""}
                        {cluster.deltaPct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
                {!trendData.topClusters.length ? (
                  <p className="text-xs text-slate-500">Sin datos de clusters.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:col-span-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">Top autores</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {trendData.topAuthors.map((author) => (
                  <div key={author.name} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">{author.name}</span>
                    <span>{author.count.toLocaleString(\"es-PR\")} menciones</span>
                  </div>
                ))}
                {!trendData.topAuthors.length ? (
                  <p className="text-xs text-slate-500">Sin autores destacados.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendRadar;
