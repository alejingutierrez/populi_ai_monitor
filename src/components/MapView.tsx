import maplibregl, { Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sentiment, SocialPost } from "../types";

interface Props {
  posts: SocialPost[];
}

type CityInsight = {
  id: string;
  city: string;
  lat: number;
  lng: number;
  total: number;
  sentiments: Record<Sentiment, number>;
  topTopics: { name: string; count: number }[];
  lastDayCount: number;
  prevDayCount: number;
  timeWindow: { from?: Date; to?: Date };
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const dominantSentiment = (sentiments: Record<Sentiment, number>) => {
  const entries = Object.entries(sentiments) as [Sentiment, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
};

const buildLocationInsights = (posts: SocialPost[]): CityInsight[] => {
  if (!posts.length) return [];

  const windowFrom = new Date(
    Math.min(...posts.map((p) => new Date(p.timestamp).getTime()))
  );
  const windowTo = new Date(
    Math.max(...posts.map((p) => new Date(p.timestamp).getTime()))
  );

  const buckets = new Map<string, SocialPost[]>();
  posts.forEach((post) => {
    const key = `${post.location.city}-${post.location.lat}-${post.location.lng}`;
    buckets.set(key, [...(buckets.get(key) ?? []), post]);
  });

  return Array.from(buckets.entries())
    .map(([key, bucket]): CityInsight => {
      const sentiments: Record<Sentiment, number> = {
        positivo: 0,
        neutral: 0,
        negativo: 0,
      };
      const topicCount = new Map<string, number>();

      bucket.forEach((post) => {
        sentiments[post.sentiment] += 1;
        topicCount.set(post.topic, (topicCount.get(post.topic) ?? 0) + 1);
      });

      const topTopics = Array.from(topicCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      const dayCounts = new Map<string, number>();
      bucket.forEach((post) => {
        const key = dayKey(new Date(post.timestamp));
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
      });
      const dayKeys = Array.from(dayCounts.keys()).sort();
      const lastDayKey = dayKeys.length ? dayKeys[dayKeys.length - 1] : undefined;
      const prevDayKey = dayKeys.length > 1 ? dayKeys[dayKeys.length - 2] : undefined;

      const loc = bucket[0].location;

      return {
        id: key,
        city: loc.city,
        lat: loc.lat,
        lng: loc.lng,
        total: bucket.length,
        sentiments,
        topTopics,
        lastDayCount: lastDayKey ? dayCounts.get(lastDayKey) ?? 0 : bucket.length,
        prevDayCount: prevDayKey ? dayCounts.get(prevDayKey) ?? 0 : 0,
        timeWindow: { from: windowFrom, to: windowTo },
      };
    })
    .sort((a, b) => b.total - a.total);
};

// Generates the popup content; replace this function when wiring an AI summarizer.
const buildInsightHtml = (insight: CityInsight) => {
  const mood = dominantSentiment(insight.sentiments);
  const positive = insight.sentiments.positivo;
  const neutral = insight.sentiments.neutral;
  const negative = insight.sentiments.negativo;
  const moodLabel =
    mood === "positivo"
      ? "Tono positivo"
      : mood === "negativo"
      ? "Tono crítico"
      : "Tono mixto";
  const topicLine =
    insight.topTopics.map((t) => `${t.name} (${t.count})`).join(" · ") ||
    "Temas variados";

  const trendDiff = insight.prevDayCount
    ? ((insight.lastDayCount - insight.prevDayCount) / insight.prevDayCount) * 100
    : null;
  const trendLabel =
    trendDiff === null
      ? `${insight.lastDayCount} menciones en el último día`
      : `${insight.lastDayCount} vs ${insight.prevDayCount} día previo (${trendDiff >= 0 ? "+" : ""}${trendDiff.toFixed(0)}%)`;
  const trendCopy =
    trendDiff === null
      ? "Último día activo"
      : `${trendDiff >= 0 ? "Alza" : "Baja"} de ${Math.abs(trendDiff).toFixed(0)}% vs día previo`;
  const trendClass = trendDiff === null ? "neutral" : trendDiff >= 0 ? "up" : "down";
  const trendSymbol = trendDiff === null ? "•" : trendDiff >= 0 ? "↑" : "↓";

  const windowLabel =
    insight.timeWindow.from && insight.timeWindow.to
      ? `${insight.timeWindow.from.toLocaleDateString("es-PR", {
          month: "short",
          day: "numeric",
        })} — ${insight.timeWindow.to.toLocaleDateString("es-PR", {
          month: "short",
          day: "numeric",
        })}`
      : "Ventana activa";

  const moodCopy =
    mood === "positivo"
      ? "predomina un tono optimista"
      : mood === "negativo"
      ? "el tono es principalmente crítico"
      : "las conversaciones son mixtas";

  return `<div class="insight-popup__body">
    <div class="insight-popup__bar"></div>
    <div class="insight-popup__header">
      <div>
        <p class="insight-popup__eyebrow">${windowLabel}</p>
        <p class="insight-popup__city">${insight.city}</p>
      </div>
    </div>
    <div class="insight-popup__meta">
      <span class="insight-popup__pill insight-popup__pill--strong">${moodLabel}</span>
      <span class="insight-popup__pill">Heurística</span>
    </div>
    <div class="insight-popup__stat">
      <div>
        <p class="insight-popup__stat-number">${insight.total}</p>
        <p class="insight-popup__muted">menciones totales</p>
      </div>
      <div class="insight-popup__trend insight-popup__trend--${trendClass}">
        <span class="insight-popup__trend-icon">${trendSymbol}</span>
        <div>
          <p class="insight-popup__trend-label">${trendCopy}</p>
          <p class="insight-popup__muted">${trendLabel}</p>
        </div>
      </div>
    </div>
    <p class="insight-popup__copy">${insight.total} menciones; ${moodCopy}.</p>
    <div class="insight-popup__section">
      <p class="insight-popup__label">Temas fuertes</p>
      <p class="insight-popup__value">${topicLine}</p>
    </div>
    <div class="insight-popup__sentiments">
      <span class="positive">👍 ${positive}</span>
      <span class="neutral">😐 ${neutral}</span>
      <span class="negative">👎 ${negative}</span>
    </div>
  </div>`;
};

const MapView = ({ posts }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<{
    insight: CityInsight;
    screen: { x: number; y: number };
  } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const anchoredInsightRef = useRef<CityInsight | null>(null);
  const moveListenerAttachedRef = useRef(false);
  const scrollListenerAttachedRef = useRef(false);

  const locationInsights = useMemo(() => buildLocationInsights(posts), [posts]);

  useEffect(() => {
    if (containerRef.current && !mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style: "https://demotiles.maplibre.org/style.json",
        center: [-66.45, 18.2],
        zoom: 8,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerCleanups: (() => void)[] = [];
    const markers: Marker[] = [];

    const clearHoverTimer = () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    const clearCloseTimer = () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };

    const computeScreenPoint = (insight: CityInsight) => {
      const point = map.project([insight.lng, insight.lat]);
      const rect = map.getContainer().getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y };
    };

    const updateTooltipPosition = () => {
      const insight = anchoredInsightRef.current;
      if (!insight) return;
      const coords = computeScreenPoint(insight);
      setActiveTooltip((prev) =>
        prev ? { insight, screen: coords } : prev
      );
    };

    const attachMoveListener = () => {
      if (moveListenerAttachedRef.current) return;
      map.on("move", updateTooltipPosition);
      map.on("resize", updateTooltipPosition);
      moveListenerAttachedRef.current = true;
      if (!scrollListenerAttachedRef.current) {
        window.addEventListener("scroll", updateTooltipPosition, true);
        scrollListenerAttachedRef.current = true;
      }
    };

    const detachMoveListener = () => {
      if (!moveListenerAttachedRef.current) return;
      map.off("move", updateTooltipPosition);
      map.off("resize", updateTooltipPosition);
      moveListenerAttachedRef.current = false;
      if (scrollListenerAttachedRef.current) {
        window.removeEventListener("scroll", updateTooltipPosition, true);
        scrollListenerAttachedRef.current = false;
      }
    };

    const openTooltip = (insight: CityInsight) => {
      clearHoverTimer();
      clearCloseTimer();
      const coords = computeScreenPoint(insight);
      anchoredInsightRef.current = insight;
      setActiveTooltip({ insight, screen: coords });
      attachMoveListener();
    };

    const scheduleClose = () => {
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setActiveTooltip(null);
        anchoredInsightRef.current = null;
        detachMoveListener();
        closeTimerRef.current = null;
      }, 1000);
    };

    locationInsights.forEach((insight) => {
      const mood = dominantSentiment(insight.sentiments);
      const color =
        mood === "positivo" ? "#16a34a" : mood === "negativo" ? "#dc2626" : "#334155";
      const size = Math.min(26, 12 + Math.log(insight.total + 1) * 6);

      const el = document.createElement("div");
      el.className =
        "rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform";
      el.style.background = color;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([insight.lng, insight.lat])
        .addTo(map);

      const handleClick = () => openTooltip(insight);
      const handleEnter = () => {
        clearCloseTimer();
        if (hoverTimerRef.current) return;
        hoverTimerRef.current = window.setTimeout(() => openTooltip(insight), 1000);
      };
      const handleLeave = () => {
        clearHoverTimer();
        scheduleClose();
      };

      el.addEventListener("mouseenter", handleEnter);
      el.addEventListener("mouseleave", handleLeave);
      el.addEventListener("click", handleClick);

      markers.push(marker);
      markerCleanups.push(() => {
        clearHoverTimer();
        clearCloseTimer();
        el.removeEventListener("mouseenter", handleEnter);
        el.removeEventListener("mouseleave", handleLeave);
        el.removeEventListener("click", handleClick);
        marker.remove();
      });
    });

    markersRef.current = markers;

    return () => {
      detachMoveListener();
      clearHoverTimer();
      clearCloseTimer();
      setActiveTooltip(null);
      anchoredInsightRef.current = null;
      markerCleanups.forEach((cleanup) => cleanup());
      markersRef.current = [];
    };
  }, [locationInsights]);

  return (
    <section className="card p-4 h-full flex flex-col min-h-[360px] min-w-0">
      <div className="card-header">
        <div>
          <p className="muted">Mapa IA</p>
        <p className="h-section">Calor social en PR</p>
      </div>
      <span className="px-3 py-1 bg-prBlue/10 text-prBlue rounded-full text-xs font-semibold">
          {locationInsights.length} puntos
      </span>
    </div>
      <div
        ref={containerRef}
        className="flex-1 rounded-xl border border-slate-200 map-shell"
        style={{ minHeight: "360px" }}
      />
      {activeTooltip && (
        <div
          className="insight-flyout"
          style={{
            left: `${activeTooltip.screen.x}px`,
            top: `${activeTooltip.screen.y - 12}px`,
          }}
        >
          <div
            className="insight-flyout__panel"
            dangerouslySetInnerHTML={{ __html: buildInsightHtml(activeTooltip.insight) }}
          />
          <span className="insight-flyout__tip" />
        </div>
      )}
    </section>
  );
};

export default MapView;
