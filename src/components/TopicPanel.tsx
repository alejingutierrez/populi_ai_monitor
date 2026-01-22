import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
  type TreemapNode,
  type TooltipContentProps,
} from "recharts";
import { useMemo, useState, type FC } from "react";

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
    isClickable?: boolean;
    onSelect?: (name: string) => void;
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
    isClickable,
    onSelect,
  } = props;
  if (!width || !height || width <= 0 || height <= 0 || volume === undefined) {
    return null;
  }
  const sentiment = volume ? (positive - negative) / volume : 0;
  const tone =
    sentiment > 0.25 ? "Positivo" : sentiment < -0.2 ? "Negativo" : "Neutral";
  const palette = sentimentPalette(props);
  const isLeaf = !children || children.length === 0;
  const labelSize = depth === 1 ? 13 : depth === 2 ? 11 : 10;
  const labelWeight = depth === 1 ? 700 : 600;
  const padding = depth === 1 ? 10 : 8;
  const radius = depth === 1 ? 14 : 10;
  const allowLabel = depth ? depth <= (labelDepth ?? 1) : true;
  const showMetrics = isLeaf && width > 110 && height > 60 && allowLabel;
  const showLabel = allowLabel && width > 40 && height > 24;

  return (
    <g style={{ cursor: isClickable ? "pointer" : "default" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        pointerEvents="all"
        onClick={isClickable ? () => onSelect?.(name) : undefined}
        style={{
          fill: palette.fill,
          opacity: depth && depth > 1 ? 0.7 : 0.85,
          stroke: "#e2e8f0",
          strokeWidth: depth === 1 ? 2 : 1,
        }}
      />
      {showLabel ? (
        <text
          x={x! + padding}
          y={y! + padding + labelSize}
          fill="#0f172a"
          fontSize={labelSize}
          fontWeight={labelWeight}
          stroke="none"
        >
          {name}
        </text>
      ) : null}
      {showMetrics ? (
        <>
          <text
            x={x! + padding}
            y={y! + padding + labelSize + 18}
            fill="#475569"
            fontSize={10}
            fontWeight={600}
            stroke="none"
          >
            {volume.toLocaleString("es-PR")} menciones
          </text>
          <rect
            x={x! + padding}
            y={y! + padding + labelSize + 26}
            rx={8}
            ry={8}
            width={70}
            height={18}
            fill={palette.accent}
            opacity={0.14}
          />
          <text
            x={x! + padding + 6}
            y={y! + padding + labelSize + 39}
            fill={palette.accent}
            fontSize={9.5}
            fontWeight={700}
            stroke="none"
          >
            {tone}
          </text>
        </>
      ) : null}
    </g>
  );
};

const TopicPanel: FC<Props> = ({ clusters }) => {
  const [activeCluster, setActiveCluster] = useState<string | null>(null);

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

  const activeClusterNode = useMemo(
    () => clusters.find((cluster) => cluster.name === activeCluster) ?? null,
    [activeCluster, clusters]
  );

  const data = useMemo(() => {
    if (activeClusterNode?.children?.length) {
      return enrichNodes(activeClusterNode.children, 1, 2);
    }
    return enrichNodes(clusters, 1, 2);
  }, [activeClusterNode, clusters]);

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
    const fullPath = activeClusterNode?.name
      ? `${activeClusterNode.name} › ${pathLabel}`
      : pathLabel;

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

  const headerTitle = activeClusterNode
    ? `Subclusters y microclusters · ${activeClusterNode.name}`
    : "Clusters de conversación";

  const headerHint = activeClusterNode
    ? "Selecciona un subcluster para explorar el detalle del microcluster en tooltip."
    : "Click en un cluster para ver su desglose.";

  return (
    <section className="card p-4 h-full flex flex-col min-h-[420px] min-w-0">
      <div className="card-header">
        <div>
          <p className="muted">Network Connections</p>
          <p className="h-section">{headerTitle}</p>
          <p className="text-xs text-slate-500 mt-1">{headerHint}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeClusterNode ? (
            <button
              type="button"
              onClick={() => setActiveCluster(null)}
              className="px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Volver
            </button>
          ) : null}
          <span className="px-3 py-1 rounded-full bg-prRed/10 text-prRed text-xs font-semibold">
            IA agrupa
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            onClick={(node) => {
              const depth = (node as TreemapNode).depth ?? 0;
              const name = (node as { name?: string }).name;
              if (!activeClusterNode && depth === 1 && name) {
                setActiveCluster(String(name));
              }
            }}
            content={(node) => (
              <CustomTile
                {...(node as TileProps)}
                labelDepth={activeClusterNode ? 1 : 1}
                isClickable={!activeClusterNode && (node as TileProps).depth === 1}
                onSelect={(name) => setActiveCluster(name)}
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
