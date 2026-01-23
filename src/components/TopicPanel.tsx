import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
  type TreemapNode,
  type TooltipContentProps,
} from "recharts";
import { useMemo, useState, useEffect, type FC } from "react";

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

type TileProps = TreemapNode &
  ClusterStat & {
    x: number;
    y: number;
    width: number;
    height: number;
    depth?: number;
    parent?: TreemapNode;
    labelDepth?: number;
    isDrillable?: boolean;
    onDrill?: (name: string) => void;
  };

const CustomTile: FC<TileProps> = (props) => {
  const {
    x,
    y,
    width,
    height,
    name,
    volume,
    positive,
    negative,
    depth,
    children,
    labelDepth,
    isDrillable,
    onDrill,
  } = props;
  if (!width || !height || width <= 0 || height <= 0 || volume === undefined) {
    return null;
  }
  const sentiment = volume ? (positive - negative) / volume : 0;
  const tone =
    sentiment > 0.25 ? "Positivo" : sentiment < -0.2 ? "Negativo" : "Neutral";
  const palette = sentimentPalette(props);
  const level = depth ?? 1;
  const labelSize = level === 1 ? 13 : level === 2 ? 11 : 10;
  const labelWeight = level === 1 ? 700 : 600;
  const padding = level === 1 ? 12 : level === 2 ? 10 : 8;
  const radius = level === 1 ? 16 : level === 2 ? 12 : 9;
  const allowLabel = level <= (labelDepth ?? 2);
  const showLabel = allowLabel && width > 46 && height > 26;
  const showMetrics = width > 120 && height > 64;
  const showTone = width > 92 && height > 46;
  const showDrillHint = isDrillable && width > 72 && height > 26;
  const headerHeight = showLabel ? (level === 1 ? 26 : 22) : 0;

  return (
    <g style={{ cursor: isDrillable ? "zoom-in" : "default" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        pointerEvents="all"
        onDoubleClick={isDrillable ? () => onDrill?.(name) : undefined}
        style={{
          fill: palette.fill,
          opacity: level > 1 ? 0.75 : 0.92,
          stroke: level === 1 ? palette.accent : "#e2e8f0",
          strokeWidth: level === 1 ? 2 : 1,
        }}
      />
      {showLabel ? (
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={headerHeight}
          rx={radius}
          ry={radius}
          fill="rgba(255,255,255,0.5)"
          pointerEvents="none"
        />
      ) : null}
      {showLabel ? (
        <text
          x={x! + padding}
          y={y! + padding + labelSize - 2}
          fill="#0f172a"
          fontSize={labelSize}
          fontWeight={labelWeight}
          stroke="none"
          pointerEvents="none"
        >
          {name}
        </text>
      ) : null}
      {showMetrics && volume !== undefined ? (
        <>
          <text
            x={x! + padding}
            y={y! + padding + labelSize + (showLabel ? 18 : 14)}
            fill="#475569"
            fontSize={10}
            fontWeight={600}
            stroke="none"
            pointerEvents="none"
          >
            {volume.toLocaleString("es-PR")} menciones
          </text>
          {showTone ? (
            <>
              <rect
                x={x! + padding}
                y={y! + padding + labelSize + (showLabel ? 26 : 22)}
                rx={8}
                ry={8}
                width={78}
                height={18}
                fill={palette.accent}
                opacity={0.14}
                pointerEvents="none"
              />
              <text
                x={x! + padding + 6}
                y={y! + padding + labelSize + (showLabel ? 39 : 35)}
                fill={palette.accent}
                fontSize={9.5}
                fontWeight={700}
                stroke="none"
                pointerEvents="none"
              >
                {tone}
              </text>
            </>
          ) : null}
        </>
      ) : null}
      {showDrillHint ? (
        <text
          x={x! + width - padding}
          y={y! + padding + labelSize - 2}
          fill="#64748b"
          fontSize={9}
          fontWeight={700}
          textAnchor="end"
          pointerEvents="none"
        >
          2x
        </text>
      ) : null}
    </g>
  );
};

const TopicPanel: FC<Props> = ({ clusters }) => {
  const [activePath, setActivePath] = useState<string[]>([]);

  if (!clusters.length) {
    return (
      <section className="card p-4 h-full flex flex-col min-h-[360px] min-w-0">
        <div className="card-header">
          <div>
            <p className="muted">Network Connections</p>
            <p className="h-section">Clusters, subclusters y microclusters</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Sin datos para mostrar clusters.
        </div>
      </section>
    );
  }

  const enrichNodes = (
    nodes: ClusterStat[],
    depth = 1,
    depthLimit = 2
  ): ClusterStat[] =>
    nodes.map((node) => ({
      ...node,
      size: node.volume,
      depth,
      children:
        depth < depthLimit && node.children
          ? enrichNodes(node.children, depth + 1, depthLimit)
          : undefined,
    }));

  const resolvePath = (path: string[]) => {
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

  const { node: activeNode, path: normalizedPath } = useMemo(
    () => resolvePath(activePath),
    [activePath, clusters]
  );

  useEffect(() => {
    if (normalizedPath.join(" / ") !== activePath.join(" / ")) {
      setActivePath(normalizedPath);
    }
  }, [activePath, normalizedPath]);

  const data = useMemo(() => {
    const depthLimit = normalizedPath.length === 0 ? 2 : normalizedPath.length === 1 ? 2 : 1;
    if (activeNode?.children?.length) {
      return enrichNodes(activeNode.children, 1, depthLimit);
    }
    return enrichNodes(clusters, 1, depthLimit);
  }, [activeNode, clusters, normalizedPath.length]);

  const renderTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const stat = payload[0]?.payload as ClusterStat & { parent?: TreemapNode } | undefined;
    if (!stat) return null;

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

    const buildPath = (node: { name?: string; parent?: TreemapNode | null }) => {
      const names: string[] = [];
      let cursor: TreemapNode | undefined | null = node as TreemapNode;
      while (cursor && typeof (cursor as { name?: string }).name === "string") {
        names.unshift((cursor as { name?: string }).name ?? "");
        cursor = (cursor as { parent?: TreemapNode }).parent;
      }
      return names.filter((name) => name && name !== "root").join(" › ");
    };

    const pathLabel = buildPath(stat);
    const basePath = normalizedPath.join(" › ");
    const fullPath = basePath ? [basePath, pathLabel].filter(Boolean).join(" › ") : pathLabel;

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
              <p className="text-base font-bold leading-tight text-ink">{fullPath}</p>
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

  const activeLevel = normalizedPath.length + 1;
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

      <div className="flex-1 min-w-0 min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            content={(node) => (
              <CustomTile
                {...(node as TileProps)}
                labelDepth={normalizedPath.length === 2 ? 1 : 2}
                isDrillable={Boolean((node as TileProps).children?.length)}
                onDrill={(name) => {
                  if (normalizedPath.length >= 2) return;
                  setActivePath([...normalizedPath, name]);
                }}
              />
            )}
            animationDuration={700}
          >
            <Tooltip cursor={{ fill: "rgba(11, 79, 156, 0.06)" }} content={renderTooltip} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default TopicPanel;
