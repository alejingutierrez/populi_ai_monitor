import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SocialPost } from "../types";
import {
  buildLocationInsights,
  dominantSentiment,
  type CityInsight,
} from "../data/geoInsights";

interface Props {
  posts: SocialPost[];
  showControls?: boolean;
  initialLayer?: "heatmap" | "clusters" | "sentiment";
  activeCity?: CityInsight | null;
  onCitySelect?: (insight: CityInsight) => void;
}

type LayerKey = "heatmap" | "clusters" | "sentiment";

const SOURCE_ID = "city-insights";
const HEATMAP_LAYER_ID = "city-heatmap";
const CLUSTER_LAYER_ID = "city-clusters";
const CLUSTER_COUNT_LAYER_ID = "city-cluster-count";
const UNCLUSTERED_LAYER_ID = "city-unclustered";


type GeoPointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoPointFeature[];
};

const buildGeoJson = (insights: CityInsight[]): GeoCollection => ({
  type: "FeatureCollection",
  features: insights.map((insight) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [insight.lng, insight.lat],
    },
    properties: {
      id: insight.id,
      city: insight.city,
      total: insight.total,
      pos: insight.sentiments.positivo,
      neu: insight.sentiments.neutral,
      neg: insight.sentiments.negativo,
      topTopics: JSON.stringify(insight.topTopics),
      lastDayCount: insight.lastDayCount,
      prevDayCount: insight.prevDayCount,
      timeFrom: insight.timeWindow.from?.toISOString(),
      timeTo: insight.timeWindow.to?.toISOString(),
      mood: dominantSentiment(insight.sentiments),
    },
  })),
});

const parseInsightFromFeature = (
  feature: maplibregl.MapGeoJSONFeature
): CityInsight | null => {
  const props = feature.properties ?? {};
  const coords = feature.geometry?.type === "Point" ? feature.geometry.coordinates : null;
  if (!coords || coords.length < 2) return null;

  const topTopicsRaw = typeof props.topTopics === "string" ? props.topTopics : "[]";
  let topTopics: { name: string; count: number }[] = [];
  try {
    topTopics = JSON.parse(topTopicsRaw);
  } catch {
    topTopics = [];
  }

  const timeFrom = props.timeFrom ? new Date(props.timeFrom) : undefined;
  const timeTo = props.timeTo ? new Date(props.timeTo) : undefined;

  return {
    id: String(props.id ?? `${props.city}-${coords[1]}-${coords[0]}`),
    city: String(props.city ?? "Sin ciudad"),
    lat: Number(coords[1]),
    lng: Number(coords[0]),
    total: Number(props.total ?? 0),
    sentiments: {
      positivo: Number(props.pos ?? 0),
      neutral: Number(props.neu ?? 0),
      negativo: Number(props.neg ?? 0),
    },
    topTopics,
    lastDayCount: Number(props.lastDayCount ?? 0),
    prevDayCount: Number(props.prevDayCount ?? 0),
    timeWindow: { from: timeFrom, to: timeTo },
  };
};

const InsightPanel = ({ insight }: { insight: CityInsight }) => {
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

  return (
    <div className="insight-popup__body">
      <div className="insight-popup__bar"></div>
      <div className="insight-popup__header">
        <div>
          <p className="insight-popup__eyebrow">{windowLabel}</p>
          <p className="insight-popup__city">{insight.city}</p>
        </div>
      </div>
      <div className="insight-popup__meta">
        <span className="insight-popup__pill insight-popup__pill--strong">
          {moodLabel}
        </span>
        <span className="insight-popup__pill">Heurística</span>
      </div>
      <div className="insight-popup__stat">
        <div>
          <p className="insight-popup__stat-number">
            {insight.total.toLocaleString("es-PR")}
          </p>
          <p className="insight-popup__muted">menciones totales</p>
        </div>
        <div className={`insight-popup__trend insight-popup__trend--${trendClass}`}>
          <span className="insight-popup__trend-icon">{trendSymbol}</span>
          <div>
            <p className="insight-popup__trend-label">{trendCopy}</p>
            <p className="insight-popup__muted">{trendLabel}</p>
          </div>
        </div>
      </div>
      <p className="insight-popup__copy">
        {insight.total.toLocaleString("es-PR")} menciones; {moodCopy}.
      </p>
      <div className="insight-popup__section">
        <p className="insight-popup__label">Temas fuertes</p>
        <p className="insight-popup__value">{topicLine}</p>
      </div>
      <div className="insight-popup__sentiments">
        <span className="positive">👍 {positive}</span>
        <span className="neutral">😐 {neutral}</span>
        <span className="negative">👎 {negative}</span>
      </div>
    </div>
  );
};

type MapLayerEvent = maplibregl.MapMouseEvent & {
  features?: maplibregl.MapGeoJSONFeature[];
};

const MapView = ({ posts, showControls = false, initialLayer = "heatmap", activeCity, onCitySelect }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const insightsRef = useRef<CityInsight[]>([]);
  const hoverTargetRef = useRef<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerKey>(initialLayer);
  const [mapReady, setMapReady] = useState(false);
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
    let map: maplibregl.Map | null = null;
    let handleLoad: (() => void) | null = null;
    if (containerRef.current && !mapRef.current) {
      const localMap = new maplibregl.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [-66.45, 18.2],
        zoom: 8,
      });

      localMap.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current = localMap;
      map = localMap;

      handleLoad = () => {
        if (localMap.getSource(SOURCE_ID)) return;
        localMap.addSource(SOURCE_ID, {
          type: "geojson",
          data: buildGeoJson(insightsRef.current),
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 50,
        });

        localMap.addLayer({
          id: HEATMAP_LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          maxzoom: 9,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "total"],
              1,
              0.2,
              50,
              1,
            ],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 9, 1.3],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 12, 9, 26],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(15, 23, 42, 0)",
              0.2,
              "#93c5fd",
              0.45,
              "#38bdf8",
              0.7,
              "#2563eb",
              1,
              "#1e3a8a",
            ],
            "heatmap-opacity": 0.6,
          },
        });

        localMap.addLayer({
          id: CLUSTER_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          minzoom: 7,
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#60a5fa",
              25,
              "#2563eb",
              75,
              "#1e3a8a",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              16,
              25,
              22,
              75,
              28,
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        localMap.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          minzoom: 7,
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        localMap.addLayer({
          id: UNCLUSTERED_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          minzoom: 8,
          paint: {
            "circle-color": [
              "match",
              ["get", "mood"],
              "positivo",
              "#16a34a",
              "negativo",
              "#dc2626",
              "#334155",
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "total"],
              1,
              8,
              15,
              14,
              50,
              20,
            ],
            "circle-opacity": 0.9,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        const applyVisibility = (layer: LayerKey) => {
          const setLayer = (id: string, visible: boolean) => {
            if (!localMap.getLayer(id)) return;
            localMap.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
          };
          setLayer(HEATMAP_LAYER_ID, layer === "heatmap");
          setLayer(CLUSTER_LAYER_ID, layer === "clusters");
          setLayer(CLUSTER_COUNT_LAYER_ID, layer === "clusters");
          setLayer(UNCLUSTERED_LAYER_ID, layer === "sentiment");
        };
        applyVisibility(activeLayer);

        mapLoadedRef.current = true;
        setMapReady(true);
      };

      localMap.on("load", handleLoad);
    }
    return () => {
      if (map && handleLoad) {
        map.off("load", handleLoad);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapLoadedRef.current = false;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    insightsRef.current = locationInsights;
    const map = mapRef.current;
    if (!map || !mapReady || !mapLoadedRef.current) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(buildGeoJson(locationInsights));
  }, [locationInsights, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !mapLoadedRef.current) return;
    const setLayer = (id: string, visible: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    };
    setLayer(HEATMAP_LAYER_ID, activeLayer === "heatmap");
    setLayer(CLUSTER_LAYER_ID, activeLayer === "clusters");
    setLayer(CLUSTER_COUNT_LAYER_ID, activeLayer === "clusters");
    setLayer(UNCLUSTERED_LAYER_ID, activeLayer === "sentiment");
  }, [activeLayer, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !mapLoadedRef.current || !activeCity) return;
    map.easeTo({
      center: [activeCity.lng, activeCity.lat],
      zoom: Math.max(9, map.getZoom()),
      duration: 800,
    });
  }, [activeCity, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !mapLoadedRef.current) return;

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
      const rawX = rect.left + point.x;
      const rawY = rect.top + point.y;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const halfWidth = 180;
      const minX = Math.min(halfWidth, viewportWidth / 2);
      const maxX = Math.max(minX, viewportWidth - halfWidth);
      const minY = 140;
      const maxY = Math.max(minY, viewportHeight - 120);

      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

      return { x: clamp(rawX, minX, maxX), y: clamp(rawY, minY, maxY) };
    };

    const updateTooltipPosition = () => {
      const insight = anchoredInsightRef.current;
      if (!insight) return;
      const coords = computeScreenPoint(insight);
      setActiveTooltip((prev) => (prev ? { insight, screen: coords } : prev));
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
      onCitySelect?.(insight);
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

    const openFromFeature = (feature: maplibregl.MapGeoJSONFeature) => {
      const insight = parseInsightFromFeature(feature);
      if (!insight) return;
      openTooltip(insight);
    };

    const handleClusterClick = (event: MapLayerEvent) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_LAYER_ID],
      });
      const cluster = features[0];
      if (!cluster) return;
      const clusterIdRaw = cluster.properties?.cluster_id;
      const clusterId = typeof clusterIdRaw === "number" ? clusterIdRaw : Number(clusterIdRaw);
      if (!Number.isFinite(clusterId)) return;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geometry = cluster.geometry as { type: string; coordinates?: [number, number] };
        if (geometry.type !== "Point" || !geometry.coordinates) return;
        const coordinates = geometry.coordinates;
        map.easeTo({ center: coordinates, zoom });
      });
    };

    const handlePointClick = (event: MapLayerEvent) => {
      const feature = event.features?.[0];
      if (feature) openFromFeature(feature);
    };

    const handlePointEnter = (event: MapLayerEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = "pointer";
      const id = String(feature.properties?.id ?? "");
      hoverTargetRef.current = id;
      clearCloseTimer();
      if (hoverTimerRef.current) return;
      hoverTimerRef.current = window.setTimeout(() => {
        if (hoverTargetRef.current !== id) return;
        openFromFeature(feature);
      }, 1000);
    };

    const handlePointLeave = () => {
      map.getCanvas().style.cursor = "";
      hoverTargetRef.current = null;
      clearHoverTimer();
      scheduleClose();
    };

    const handleClusterEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleClusterLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const handleKeyClose = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clearHoverTimer();
      clearCloseTimer();
      setActiveTooltip(null);
      anchoredInsightRef.current = null;
      detachMoveListener();
    };

    map.on("click", CLUSTER_LAYER_ID, handleClusterClick);
    map.on("click", UNCLUSTERED_LAYER_ID, handlePointClick);
    map.on("mouseenter", UNCLUSTERED_LAYER_ID, handlePointEnter);
    map.on("mouseleave", UNCLUSTERED_LAYER_ID, handlePointLeave);
    map.on("mouseenter", CLUSTER_LAYER_ID, handleClusterEnter);
    map.on("mouseleave", CLUSTER_LAYER_ID, handleClusterLeave);
    window.addEventListener("keydown", handleKeyClose);

    return () => {
      window.removeEventListener("keydown", handleKeyClose);
      map.off("click", CLUSTER_LAYER_ID, handleClusterClick);
      map.off("click", UNCLUSTERED_LAYER_ID, handlePointClick);
      map.off("mouseenter", UNCLUSTERED_LAYER_ID, handlePointEnter);
      map.off("mouseleave", UNCLUSTERED_LAYER_ID, handlePointLeave);
      map.off("mouseenter", CLUSTER_LAYER_ID, handleClusterEnter);
      map.off("mouseleave", CLUSTER_LAYER_ID, handleClusterLeave);
      detachMoveListener();
      clearHoverTimer();
      clearCloseTimer();
      setActiveTooltip(null);
      anchoredInsightRef.current = null;
    };
  }, [mapReady, onCitySelect]);

  return (
    <section className="card p-4 h-full flex flex-col min-h-[360px] min-w-0">
      <div className="card-header">
        <div>
          <p className="muted">Geo Tagging</p>
          <p className="h-section">Calor social en PR</p>
        </div>
        <span className="px-3 py-1 bg-prBlue/10 text-prBlue rounded-full text-xs font-semibold">
          {locationInsights.length} puntos
        </span>
      </div>
      <div className="relative flex-1 min-h-[360px]">
        <div
          ref={containerRef}
          className="h-full w-full rounded-xl border border-slate-200 map-shell"
          style={{ minHeight: "360px" }}
          aria-label="Mapa de calor social"
        />
        {showControls ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl p-2 text-[11px] font-semibold text-slate-600">
            {[
              { key: "heatmap", label: "Heatmap" },
              { key: "clusters", label: "Clusters" },
              { key: "sentiment", label: "Sentimiento" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveLayer(item.key as LayerKey)}
                className={`px-2.5 py-1 rounded-full border transition ${
                  activeLayer === item.key
                    ? "border-prBlue bg-prBlue/10 text-prBlue"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {showControls ? (
          <div className="absolute bottom-3 left-3 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm px-3 py-2 text-[11px] text-slate-600 space-y-2">
            <div className="font-semibold text-slate-500 uppercase tracking-[0.12em]">
              Leyenda
            </div>
            {activeLayer === "sentiment" ? (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Positivo
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Neutral
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Negativo
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="h-2 w-32 rounded-full bg-gradient-to-r from-sky-200 via-sky-500 to-blue-900" />
                <p className="text-[10px] text-slate-500">Baja → Alta intensidad</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {activeTooltip && (
        <div
          className="insight-flyout"
          style={{
            left: `${activeTooltip.screen.x}px`,
            top: `${activeTooltip.screen.y - 12}px`,
          }}
        >
          <div className="insight-flyout__panel">
            <InsightPanel insight={activeTooltip.insight} />
          </div>
          <span className="insight-flyout__tip" />
        </div>
      )}
    </section>
  );
};

export default MapView;
