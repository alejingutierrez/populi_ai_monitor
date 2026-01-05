import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { Payload as TooltipPayload } from "recharts/types/component/DefaultTooltipContent";
import type { FC } from "react";
import { useMemo, useState } from "react";
import type { LegendPayload, Props as LegendContentProps } from "recharts/types/component/DefaultLegendContent";
import type { TimelineDatum } from "../types";

type TimelineMetricKey =
  | "publicaciones"
  | "alcance"
  | "engagement"
  | "sentimentIndex"
  | "reputationalRisk"
  | "polarization"
  | "viralPropensity";

type AxisMetric = TimelineMetricKey | "none";

interface MetricDefinition {
  key: TimelineMetricKey;
  label: string;
  color: string;
  formatter: (value: number) => string;
}

const metricDefinitions: MetricDefinition[] = [
  {
    key: "publicaciones",
    label: "Publicaciones",
    color: "#0b4f9c",
    formatter: (value: number) =>
      Number.isFinite(value) ? value.toLocaleString("es-PR") : "0",
  },
  {
    key: "alcance",
    label: "Alcance estimado",
    color: "#d62828",
    formatter: (value: number) =>
      Number.isFinite(value) ? value.toLocaleString("es-PR") : "0",
  },
  {
    key: "engagement",
    label: "Engagement prom.",
    color: "#0ea5e9",
    formatter: (value: number) =>
      Number.isFinite(value)
        ? value.toLocaleString("es-PR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "0",
  },
  {
    key: "sentimentIndex",
    label: "Índice de sentimiento",
    color: "#16a34a",
    formatter: (value: number) =>
      Number.isFinite(value)
        ? value.toLocaleString("es-PR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "0",
  },
  {
    key: "reputationalRisk",
    label: "Riesgo reputacional",
    color: "#f97316",
    formatter: (value: number) =>
      Number.isFinite(value)
        ? value.toLocaleString("es-PR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "0",
  },
  {
    key: "polarization",
    label: "Polarización",
    color: "#334155",
    formatter: (value: number) =>
      Number.isFinite(value)
        ? value.toLocaleString("es-PR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "0",
  },
  {
    key: "viralPropensity",
    label: "Propensión a viralidad",
    color: "#0891b2",
    formatter: (value: number) =>
      Number.isFinite(value)
        ? value.toLocaleString("es-PR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : "0",
  },
];

const renderLegend = ({ payload }: LegendContentProps) => {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-5 text-[10px] leading-[14px] pt-0 pb-2 px-2 mb-1">
      {payload.map((entry: LegendPayload, index: number) => {
        const legendKey =
          typeof entry.dataKey === "string" || typeof entry.dataKey === "number"
            ? entry.dataKey
            : entry.value ?? index;

        return (
        <span
          key={legendKey}
          className="inline-flex items-center gap-2.5 font-semibold text-slate-700"
        >
          <span
            className="h-2.5 w-2.5 rounded-full border border-slate-200"
            style={{ backgroundColor: entry.color ?? "#475569" }}
          />
          <span>{entry.value}</span>
        </span>
        );
      })}
    </div>
  );
};

interface Props {
  data: TimelineDatum[];
}

const TimelineChart: FC<Props> = ({ data }) => {
  const [leftMetric, setLeftMetric] = useState<TimelineMetricKey>("publicaciones");
  const [rightMetric, setRightMetric] = useState<AxisMetric>("none");

  const metricMap = useMemo(
    () => Object.fromEntries(metricDefinitions.map((metric) => [metric.key, metric])),
    []
  );

  const handleLeftChange = (metric: TimelineMetricKey) => {
    setLeftMetric(metric);
    if (metric === rightMetric) setRightMetric("none");
  };

  const handleRightChange = (metric: AxisMetric) => {
    if (metric === leftMetric) {
      setRightMetric("none");
      return;
    }
    setRightMetric(metric);
  };

  const activeMetrics = useMemo(
    () => (rightMetric === "none" ? [leftMetric] : [leftMetric, rightMetric]),
    [leftMetric, rightMetric]
  );

  const hasDual = activeMetrics.length > 1;
  const legendHeight = hasDual ? 24 : 0;
  const yTickMargin = 6;
  const xTickMargin = 6;

  const estimateTickWidth = (formatter?: (value: number) => string) => {
    const samples = [0, 10, 100, 1000, 100000, 1000000];
    const maxLen = Math.max(
      ...samples.map((sample) => {
        const formatted = formatter ? formatter(sample) : String(sample);
        return formatted?.toString().length ?? 1;
      })
    );
    return Math.min(60, Math.max(28, maxLen * 6));
  };

  const leftColor = metricMap[leftMetric]?.color ?? "#0f172a";
  const rightColor = rightMetric === "none" ? undefined : metricMap[rightMetric]?.color;
  const leftTickWidth = estimateTickWidth(metricMap[leftMetric]?.formatter);
  const rightTickWidth =
    rightMetric === "none" ? 0 : estimateTickWidth(metricMap[rightMetric]?.formatter);
  const leftAxisWidth = Math.max(22, Math.min(56, leftTickWidth + 4));
  const rightAxisWidth =
    rightMetric === "none" ? 0 : Math.max(22, Math.min(56, rightTickWidth + 4));
  const legendSpacer = hasDual ? 12 : 6;

  const chartMargin = {
    top: legendHeight + legendSpacer,
    right: hasDual ? 4 : 2,
    left: hasDual ? 4 : 2,
    bottom: 14,
  };

  const formatMetricValue = (metricKey: TimelineMetricKey, value: unknown) => {
    const metric = metricMap[metricKey];
    const numeric = typeof value === "number" ? value : Number(value ?? 0);
    return metric ? metric.formatter(numeric) : String(value ?? "");
  };

  const formatDelta = (metricKey: TimelineMetricKey, delta: number) => {
    const metric = metricMap[metricKey];
    const sign = delta > 0 ? "+" : "";
    return `${sign}${metric ? metric.formatter(delta) : delta.toFixed(1)}`;
  };

  const renderTooltip = ({ active, payload, label }: TooltipContentProps<number, string>) => {
    if (!active || !payload?.length) return null;

    const currentPoint = payload[0]?.payload as TimelineDatum | undefined;
    const pointIndex = currentPoint ? data.findIndex((d) => d.time === currentPoint.time) : -1;
    const prevPoint = pointIndex > 0 ? data[pointIndex - 1] : undefined;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-xl min-w-[220px] space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Día</span>
          <span className="text-sm font-bold text-ink">{label}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: TooltipPayload<number, string>) => {
            const metricKey = entry.dataKey as TimelineMetricKey;
            const metric = metricMap[metricKey];
            if (!metric) return null;

            const prevValue = prevPoint?.[metricKey];
            const hasPrev = typeof prevValue === "number" && Number.isFinite(prevValue);
            const delta = hasPrev ? Number(entry.value ?? 0) - prevValue : undefined;
            const deltaPct =
              hasPrev && prevValue !== 0 && delta !== undefined
                ? (delta / Math.abs(prevValue)) * 100
                : undefined;
            const axisLabel =
              metricKey === leftMetric ? "eje izq." : metricKey === rightMetric ? "eje der." : undefined;

            let deltaSection = null;
            if (delta !== undefined) {
              const deltaText = formatDelta(metricKey, delta);
              deltaSection = (
                <div className="mt-1 flex items-center justify-end gap-2 text-[10px] font-semibold tabular-nums">
                  <span
                    className={`px-1.5 py-0.5 rounded-full ${
                      delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {delta >= 0 ? "▲" : "▼"} {deltaText}
                  </span>
                  {deltaPct !== undefined && Number.isFinite(deltaPct) ? (
                    <span className="text-slate-500">
                      {`${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs. día previo`}
                    </span>
                  ) : null}
                </div>
              );
            }

            return (
              <div
                key={metricKey}
                className="rounded-lg border border-slate-100 px-2 py-1.5 bg-slate-50/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {metric.label}
                    </span>
                    {axisLabel ? (
                      <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                        {axisLabel}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatMetricValue(metricKey, entry.value)}
                  </span>
                </div>
                {deltaSection}
              </div>
            );
          })}
        </div>
        {currentPoint ? (
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span>
              Actividad total del día: {formatMetricValue("publicaciones", currentPoint.publicaciones)}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="card p-4 h-full flex flex-col min-h-[320px] min-w-0">
      <div className="card-header items-start gap-4 flex-col xl:flex-row xl:items-center">
        <div className="space-y-1">
          <p className="muted">Flujo temporal</p>
          <p className="h-section">Comparador de métricas</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto">
          <label className="text-xs text-slate-600 font-semibold flex flex-col gap-1">
            Serie 1 (eje izquierdo)
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: leftColor }}
              />
              <select
                value={leftMetric}
                onChange={(e) => handleLeftChange(e.target.value as TimelineMetricKey)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-prBlue focus:outline-none"
              >
                {metricDefinitions.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="text-xs text-slate-600 font-semibold flex flex-col gap-1">
            Serie 2 (eje derecho)
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: rightColor ?? "#cbd5e1" }}
              />
              <select
                value={rightMetric}
                onChange={(e) => handleRightChange(e.target.value as AxisMetric)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-prBlue focus:outline-none"
              >
                <option value="none">Ninguna (solo una serie)</option>
                {metricDefinitions.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </div>
      <div className="flex-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Sin datos para el rango seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={chartMargin}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                tickMargin={xTickMargin}
                minTickGap={12}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: leftColor }}
                axisLine={{ stroke: leftColor }}
                tickLine={{ stroke: leftColor }}
                tickMargin={yTickMargin}
                width={leftAxisWidth}
                tickFormatter={(value: number) =>
                  metricMap[leftMetric]?.formatter(value) ?? String(value)
                }
              />
              {rightMetric !== "none" ? (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: rightColor }}
                  axisLine={{ stroke: rightColor }}
                  tickLine={{ stroke: rightColor }}
                  tickMargin={yTickMargin}
                  width={rightAxisWidth}
                  tickFormatter={(value: number) =>
                    metricMap[rightMetric]?.formatter(value) ?? String(value)
                  }
                />
              ) : null}
              {hasDual ? (
                <Legend
                  verticalAlign="top"
                  align="center"
                  height={legendHeight}
                  content={renderLegend}
                />
              ) : null}
              <Tooltip content={renderTooltip} wrapperStyle={{ outline: "none" }} />
              {activeMetrics.map((metricKey, index) => {
                const metric = metricMap[metricKey];
                if (!metric) return null;
                const yAxisId = index === 0 ? "left" : "right";
                return (
                  <Area
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    name={`${metric.label} (${index === 0 ? "eje izq." : "eje der."})`}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    fill={metric.color}
                    fillOpacity={0.15}
                    yAxisId={yAxisId}
                    isAnimationActive
                    animationDuration={700}
                    activeDot={{ r: 3.5 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default TimelineChart;
