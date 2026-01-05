import {
  ResponsiveContainer,
  Tooltip,
  Treemap,
  type TreemapNode,
  type TooltipContentProps,
} from "recharts";
import type { FC } from "react";

export interface ClusterStat {
  name: string;
  volume: number;
  positive: number;
  negative: number;
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
  };

const CustomTile: FC<TileProps> = (props) => {
  const { x, y, width, height, name, volume, positive, negative } = props;
  if (!width || !height || width <= 0 || height <= 0 || volume === undefined) {
    return null;
  }
  const sentiment = volume ? (positive - negative) / volume : 0;
  const tone =
    sentiment > 0.25 ? "Positivo" : sentiment < -0.2 ? "Negativo" : "Neutral";
  const palette = sentimentPalette(props);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        ry={12}
        style={{
          fill: palette.fill,
          opacity: 0.8,
          stroke: "#cbd5e1",
        }}
      />
      <text
        x={x! + 10}
        y={y! + 18}
        fill="#0f172a"
        fontSize={13}
        fontWeight={700}
        stroke="none"
      >
        {name}
      </text>
      <text
        x={x! + 10}
        y={y! + 36}
        fill="#475569"
        fontSize={11}
        fontWeight={600}
        stroke="none"
      >
        {volume.toLocaleString("es-PR")} menciones
      </text>
      <rect
        x={x! + 10}
        y={y! + 44}
        rx={8}
        ry={8}
        width={78}
        height={20}
        fill={palette.accent}
        opacity={0.14}
      />
      <text
        x={x! + 16}
        y={y! + 58}
        fill={palette.accent}
        fontSize={10}
        fontWeight={700}
        stroke="none"
      >
        {tone}
      </text>
    </g>
  );
};

const TopicPanel: FC<Props> = ({ clusters }) => {
  if (!clusters.length) {
    return (
      <section className="card p-4 h-full flex flex-col min-h-[360px] min-w-0">
        <div className="card-header">
          <div>
            <p className="muted">Núcleos</p>
            <p className="h-section">Clusters de conversación</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Sin datos para mostrar clusters.
        </div>
      </section>
    );
  }

  const data = clusters.map((c) => ({
    ...c,
    size: c.volume,
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const stat = payload[0]?.payload as ClusterStat | undefined;
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
                Núcleo
              </p>
              <p className="text-base font-bold leading-tight text-ink">{stat.name}</p>
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
          <p className="muted">Núcleos</p>
          <p className="h-section">Clusters de conversación</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-prRed/10 text-prRed text-xs font-semibold">
          IA agrupa
        </span>
      </div>

      <div className="flex-1 min-w-0 min-h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            content={(node) => <CustomTile {...(node as TileProps)} />}
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
