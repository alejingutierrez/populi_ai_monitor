import { useEffect, useId, useMemo, useRef, useState, type FC } from "react";
import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyNode,
  type HierarchyRectangularNode,
} from "d3-hierarchy";

export interface ClusterStat {
  name: string;
  volume: number;
  positive: number;
  negative: number;
  children?: ClusterStat[];
  size?: number;
  depth?: number;
  [key: string]: unknown;
}

interface Props {
  clusters: ClusterStat[];
}

const sentimentPalette = (stat: ClusterStat) => {
  const score = stat.volume
    ? (stat.positive - stat.negative) / stat.volume
    : 0;
  if (score > 0.25) {
    return { fill: "#d7e8ff", accent: "#0b4f9c" };
  }
  if (score < -0.2) {
    return { fill: "#ffd9d9", accent: "#d62828" };
  }
  return { fill: "#e5e7eb", accent: "#334155" };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const truncateLabel = (label: string, maxChars: number) => {
  if (label.length <= maxChars) return label;
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
};

type TreemapNode = HierarchyRectangularNode<ClusterStat>;

type TooltipState = {
  id: string;
  node: TreemapNode;
  x: number;
  y: number;
};

const resolveClusterPath = (clusters: ClusterStat[], path: string[]) => {
  let cursor: ClusterStat | null = null;
  let cursorList = clusters;
  const validPath: string[] = [];
  for (const name of path) {
    const match = cursorList.find((item) => item.name === name);
    if (!match) break;
    validPath.push(name);
    cursor = match;
    cursorList = match.children ?? [];
  }
  return { node: cursor, path: validPath };
};

const TopicPanel: FC<Props> = ({ clusters }) => {
  const [activePath, setActivePath] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const idPrefix = useId().replace(/[:]/g, "");

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { node: activeNode, path: normalizedPath } = useMemo(
    () => resolveClusterPath(clusters, activePath),
    [activePath, clusters]
  );

  const activeLevel = normalizedPath.length + 1;

  const treeRoot = useMemo(() => {
    const children = normalizedPath.length ? activeNode?.children ?? [] : clusters;
    return {
      name: normalizedPath[normalizedPath.length - 1] ?? "root",
      volume: 0,
      positive: 0,
      negative: 0,
      children,
    } satisfies ClusterStat;
  }, [activeNode, clusters, normalizedPath]);

  const tiles = useMemo((): TreemapNode[] => {
    if (!bounds.width || !bounds.height) return [];
    const root = hierarchy<ClusterStat>(treeRoot)
      .sum((d: ClusterStat) => d.volume ?? 0)
      .sort(
        (a: HierarchyNode<ClusterStat>, b: HierarchyNode<ClusterStat>) =>
          (b.value ?? 0) - (a.value ?? 0)
      );

    const padding = clamp(Math.min(bounds.width, bounds.height) * 0.03, 8, 18);
    const innerPadding = clamp(padding * 0.55, 4, 12);

    const layoutRoot = treemap<ClusterStat>()
      .size([bounds.width, bounds.height])
      .paddingInner(innerPadding)
      .paddingOuter(padding)
      .tile(treemapSquarify)
      .round(true)(root);

    return layoutRoot.children ?? [];
  }, [bounds.height, bounds.width, treeRoot]);

  const headerTitle =
    activeLevel === 1
      ? "Clusters de conversación"
      : activeLevel === 2
      ? `Subclusters · ${normalizedPath[0] ?? ""}`
      : `Microclusters · ${normalizedPath[1] ?? ""}`;

  const headerHint =
    activeLevel === 1
      ? "Doble clic en un cluster para explorar sus subclusters."
      : activeLevel === 2
      ? "Doble clic en un subcluster para abrir microclusters."
      : "Explora el detalle en cada microcluster con el tooltip enriquecido.";

  const tooltipNode = tooltip?.node;
  const tooltipStat = tooltipNode?.data;
  const tooltipStyle = tooltip
    ? {
        left: clamp(tooltip.x + 16, 12, Math.max(12, bounds.width - 300)),
        top: clamp(tooltip.y + 16, 12, Math.max(12, bounds.height - 220)),
      }
    : undefined;

  const renderTooltip = (stat: ClusterStat) => {
    const palette = sentimentPalette(stat);
    const total = stat.volume ?? 0;
    const positivePct = total ? Math.round((stat.positive / total) * 100) : 0;
    const negativePct = total ? Math.round((stat.negative / total) * 100) : 0;
    const neutralCount = Math.max(0, total - stat.positive - stat.negative);
    const neutralPct = total ? Math.max(0, 100 - positivePct - negativePct) : 0;
    const net = stat.positive - stat.negative;
    const sentimentScore = total ? net / total : 0;
    const toneLabel =
      sentimentScore > 0.25
        ? "Pulso optimista"
        : sentimentScore < -0.2
        ? "Pulso crítico"
        : "Pulso mixto";
    const balanceLabel =
      net === 0 ? "Balance neutro" : net > 0 ? "Predominio favorable" : "Predominio crítico";
    const pathLabel = [...normalizedPath, stat.name].filter(Boolean).join(" › ");

    return (
      <div className="relative min-w-[240px] max-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(140% 120% at 100% 0%, ${palette.accent}1a 0%, transparent 55%), linear-gradient(135deg, #ffffff 0%, #f8fafc 90%)`,
          }}
        />
        <div className="relative space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Network path
              </p>
              <p className="text-base font-bold leading-tight text-ink">{pathLabel}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {total.toLocaleString("es-PR")} menciones
              </p>
            </div>
            <span
              className="rounded-full border px-2 py-1 text-[10px] font-bold"
              style={{
                color: palette.accent,
                borderColor: `${palette.accent}66`,
                background: palette.fill,
              }}
            >
              {toneLabel}
            </span>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-100 bg-white/70 px-3 py-2 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>{balanceLabel}</span>
              <span className="text-ink tabular-nums">
                {net > 0 ? "+" : ""}
                {net.toLocaleString("es-PR")} neto
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, positivePct))}%`,
                  background: "linear-gradient(90deg, #16a34a, #22c55e)",
                }}
              />
              {neutralPct > 0 ? (
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, neutralPct))}%`,
                    background: "#e2e8f0",
                  }}
                />
              ) : null}
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, negativePct))}%`,
                  background: "linear-gradient(90deg, #fda4af, #ef4444)",
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                👍 {stat.positive.toLocaleString("es-PR")} ({positivePct}%)
              </span>
              {neutralCount > 0 ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                  😐 {neutralCount.toLocaleString("es-PR")} ({neutralPct}%)
                </span>
              ) : null}
              <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                👎 {stat.negative.toLocaleString("es-PR")} ({negativePct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="h-2 w-2 rounded-full border border-slate-300 bg-white" />
            <span>
              Pulso del día: {toneLabel}. {balanceLabel.toLowerCase()} frente a menciones críticas.
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="card p-4 h-full flex flex-col min-h-[420px] min-w-0">
      <div className="card-header">
        <div>
          <p className="muted">Network Connections</p>
          <p className="h-section">{headerTitle}</p>
          <p className="text-xs text-slate-500 mt-1">{headerHint}</p>
        </div>
        <div className="flex items-center gap-2">
          {normalizedPath.length ? (
            <button
              type="button"
              onClick={() => setActivePath(normalizedPath.slice(0, -1))}
              className="px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Subir un nivel
            </button>
          ) : null}
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            Nivel {activeLevel} de 3
          </span>
          <span className="px-3 py-1 rounded-full bg-prRed/10 text-prRed text-xs font-semibold">
            IA agrupa
          </span>
        </div>
      </div>
      {normalizedPath.length ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
          <button
            type="button"
            className="font-semibold text-slate-600 hover:text-slate-800"
            onClick={() => setActivePath([])}
          >
            Clusters
          </button>
          {normalizedPath.map((segment, index) => (
            <div key={`${segment}-${index}`} className="flex items-center gap-2">
              <span className="text-slate-300">/</span>
              <button
                type="button"
                className="font-semibold text-slate-600 hover:text-slate-800"
                onClick={() => setActivePath(normalizedPath.slice(0, index + 1))}
              >
                {segment}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex-1 min-w-0 min-h-[360px] relative">
        <div
          ref={containerRef}
          className="h-full w-full overflow-hidden rounded-2xl border border-slate-100"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(248,250,252,0.95) 0%, rgba(255,255,255,0.95) 55%, rgba(255,255,255,1) 100%)",
          }}
        >
          {bounds.width && bounds.height ? (
            <svg width={bounds.width} height={bounds.height}>
              {tiles.map((node: TreemapNode, index: number) => {
                const width = Math.max(0, node.x1 - node.x0);
                const height = Math.max(0, node.y1 - node.y0);
                if (width < 6 || height < 6) return null;
                const stat = node.data;
                const palette = sentimentPalette(stat);
                const isDrillable = Boolean(stat.children?.length) && activeLevel < 3;
                const nodeId = `${normalizedPath.join("/")}|${stat.name}|${index}`;
                const isHovered = tooltip?.id === nodeId;
                const padding = width > 140 ? 12 : 10;
                const labelSize = width > 180 ? 13 : 11;
                const labelMaxChars = Math.max(4, Math.floor((width - padding * 2) / (labelSize * 0.6)));
                const showLabel = width > 70 && height > 30;
                const showMetrics = width > 140 && height > 70;
                const showTone = width > 110 && height > 52;
                const showDrillHint = isDrillable && width > 68 && height > 26;
                const radius = width > 160 && height > 120 ? 16 : 12;
                const clipId = `${idPrefix}-clip-${index}`;

                return (
                  <g
                    key={nodeId}
                    transform={`translate(${node.x0}, ${node.y0})`}
                    onMouseMove={(event) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({
                        id: nodeId,
                        node,
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onDoubleClick={() => {
                      if (!isDrillable) return;
                      setActivePath([...normalizedPath, stat.name]);
                    }}
                    style={{ cursor: isDrillable ? "zoom-in" : "default" }}
                  >
                    <defs>
                      <clipPath id={clipId}>
                        <rect width={width} height={height} rx={radius} ry={radius} />
                      </clipPath>
                    </defs>
                    <rect
                      width={width}
                      height={height}
                      rx={radius}
                      ry={radius}
                      fill={palette.fill}
                      stroke={isHovered ? palette.accent : "rgba(148,163,184,0.5)"}
                      strokeWidth={isHovered ? 2.2 : 1.2}
                      opacity={isHovered ? 0.95 : 0.9}
                    />
                    <g clipPath={`url(#${clipId})`}>
                      {showLabel ? (
                        <rect
                          x={1}
                          y={1}
                          width={Math.max(0, width - 2)}
                          height={labelSize + 16}
                          rx={radius}
                          ry={radius}
                          fill="rgba(255,255,255,0.5)"
                        />
                      ) : null}
                      {showLabel ? (
                        <text
                          x={padding}
                          y={padding + labelSize - 2}
                          fontSize={labelSize}
                          fontWeight={700}
                          fill="#0f172a"
                        >
                          {truncateLabel(stat.name, labelMaxChars)}
                        </text>
                      ) : null}
                      {showMetrics ? (
                        <text
                          x={padding}
                          y={padding + labelSize + 16}
                          fontSize={10}
                          fontWeight={600}
                          fill="#475569"
                        >
                          {stat.volume.toLocaleString("es-PR")} menciones
                        </text>
                      ) : null}
                      {showTone ? (
                        <g>
                          <rect
                            x={padding}
                            y={padding + labelSize + 24}
                            width={86}
                            height={18}
                            rx={8}
                            ry={8}
                            fill={palette.accent}
                            opacity={0.14}
                          />
                          <text
                            x={padding + 6}
                            y={padding + labelSize + 37}
                            fontSize={9.5}
                            fontWeight={700}
                            fill={palette.accent}
                          >
                            {stat.volume
                              ? (stat.positive - stat.negative) / stat.volume > 0.25
                                ? "Positivo"
                                : (stat.positive - stat.negative) / stat.volume < -0.2
                                ? "Negativo"
                                : "Neutral"
                              : "Neutral"}
                          </text>
                        </g>
                      ) : null}
                      {showDrillHint ? (
                        <text
                          x={width - padding}
                          y={padding + labelSize - 2}
                          fontSize={9}
                          fontWeight={700}
                          fill="#64748b"
                          textAnchor="end"
                        >
                          2x
                        </text>
                      ) : null}
                    </g>
                  </g>
                );
              })}
            </svg>
          ) : null}
          {!clusters.length ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Sin datos para mostrar clusters.
            </div>
          ) : bounds.width && bounds.height && !tiles.length ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              No hay subniveles para mostrar en este nivel.
            </div>
          ) : null}
          {tooltipStat && tooltipStyle ? (
            <div
              className="absolute z-10 pointer-events-none"
              style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
            >
              {renderTooltip(tooltipStat)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default TopicPanel;
