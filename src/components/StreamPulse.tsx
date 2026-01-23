import {
  ArrowTrendingUpIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  GlobeAmericasIcon,
  MapPinIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import type { FC, ReactNode } from "react";
import type { SocialPost } from "../types";

interface Metrics {
  totalPosts: number;
  reach: number;
  avgEngagement: number;
  topTopic: string;
  topCities: string[];
  sentimentIndex: number;
  reputationalRisk: number;
  polarization: number;
  viralPropensity: number;
  deltas: {
    totalPct: number;
    reachPct: number;
    engagementPct: number;
    sentimentPct: number;
    reputationPct: number;
    polarizationPct: number;
    viralPropensityPct: number;
  };
}

interface Props {
  posts: SocialPost[];
  metrics: Metrics;
}

const compactFormatter = new Intl.NumberFormat("es-PR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullFormatter = new Intl.NumberFormat("es-PR");

const formatCompact = (value: number) =>
  Number.isFinite(value) ? compactFormatter.format(value) : "0";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const StreamPulse: FC<Props> = ({ posts, metrics }) => {
  const reduceMotion = useReducedMotion();
  const latestTimestamp = posts.reduce(
    (max, post) => Math.max(max, new Date(post.timestamp).getTime()),
    0
  );
  const lastActivityLabel = latestTimestamp
    ? new Date(latestTimestamp).toLocaleString("es-PR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const sentimentCount = posts.reduce(
    (acc, post) => {
      acc[post.sentiment] += 1;
      return acc;
    },
    { positivo: 0, neutral: 0, negativo: 0 }
  );
  const sentimentTotalRaw = Object.values(sentimentCount).reduce((a, b) => a + b, 0);
  const sentimentTotal = Math.max(1, sentimentTotalRaw);
  const positivePct = clamp((sentimentCount.positivo / sentimentTotal) * 100, 0, 100);
  const neutralPct = clamp((sentimentCount.neutral / sentimentTotal) * 100, 0, 100);
  const negativePct = clamp((sentimentCount.negativo / sentimentTotal) * 100, 0, 100);

  const platformCount = posts.reduce((acc, post) => {
    acc.set(post.platform, (acc.get(post.platform) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const topPlatforms = Array.from(platformCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const signals: { label: string; tone: string }[] = [];
  if (metrics.reputationalRisk >= 70) {
    signals.push({ label: "Riesgo reputacional crítico", tone: "bg-rose-50 text-rose-700" });
  }
  if (metrics.polarization >= 60) {
    signals.push({ label: "Polarización elevada", tone: "bg-amber-50 text-amber-700" });
  }
  if (metrics.viralPropensity >= 65) {
    signals.push({ label: "Potencial viral en aumento", tone: "bg-sky-50 text-sky-700" });
  }
  if (metrics.sentimentIndex <= 45) {
    signals.push({ label: "Sentimiento promedio en descenso", tone: "bg-slate-100 text-slate-600" });
  }
  if (!signals.length) {
    signals.push({ label: "Sin alertas críticas en este rango", tone: "bg-emerald-50 text-emerald-700" });
  }

  const cards: {
    label: string;
    value: string;
    valueTitle?: string;
    accent: string;
    icon: ReactNode;
  }[] = [
    {
      label: "Publicaciones",
      value: formatCompact(metrics.totalPosts),
      valueTitle: fullFormatter.format(metrics.totalPosts),
      accent: "from-prBlue to-prBlue/90",
      icon: <GlobeAmericasIcon className="h-5 w-5 text-white" />,
    },
    {
      label: "Alcance",
      value: formatCompact(metrics.reach),
      valueTitle: fullFormatter.format(metrics.reach),
      accent: "from-prRed to-prBlue",
      icon: <BoltIcon className="h-5 w-5 text-white" />,
    },
    {
      label: "Engagement prom.",
      value: formatCompact(metrics.avgEngagement),
      valueTitle: fullFormatter.format(Math.round(metrics.avgEngagement)),
      accent: "from-prBlue to-prRed",
      icon: <ArrowTrendingUpIcon className="h-5 w-5 text-white" />,
    },
    {
      label: "Sentimiento",
      value: `${metrics.sentimentIndex.toFixed(1)} / 100`,
      accent: "from-emerald-500 to-teal-500",
      icon: <SparklesIcon className="h-5 w-5 text-white" />,
    },
    {
      label: "Riesgo",
      value: `${metrics.reputationalRisk.toFixed(1)} / 100`,
      accent: "from-orange-400 to-red-500",
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-white" />,
    },
  ];

  return (
    <section className="card p-4">
      <div className="card-header items-start gap-4 flex-col lg:flex-row lg:items-center">
        <div className="space-y-1">
          <p className="muted">Feed Stream</p>
          <p className="h-section">Pulso operativo</p>
          <p className="text-xs text-slate-500">
            Última actividad {lastActivityLabel} · {metrics.topTopic} domina la conversación
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            IA en vivo
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
            {metrics.topCities.slice(0, 2).join(" · ") || "Municipios"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <motion.div
              key={card.label}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                    {card.label}
                  </p>
                  <p className="text-lg font-semibold text-ink" title={card.valueTitle}>
                    {card.value}
                  </p>
                </div>
                <div className={`metric-icon-box bg-gradient-to-br ${card.accent}`}>
                  {card.icon}
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Ventana actual · {metrics.totalPosts.toLocaleString("es-PR")} posts
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
                Sentimiento actual
              </p>
              <span className="text-xs font-semibold text-slate-500">
                {fullFormatter.format(sentimentTotalRaw)} menciones
              </span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${positivePct}%` }} />
              {neutralPct > 0 ? (
                <div className="h-full bg-slate-300" style={{ width: `${neutralPct}%` }} />
              ) : null}
              <div className="h-full bg-rose-500" style={{ width: `${negativePct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                Positivo {positivePct.toFixed(0)}%
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                Neutral {neutralPct.toFixed(0)}%
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                Negativo {negativePct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
                Municipios clave
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {metrics.topCities.slice(0, 4).map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-prGray bg-prBlue/10 px-2.5 py-1 text-[11px] font-semibold text-prBlue"
                >
                  {city}
                </span>
              ))}
              {metrics.topCities.length === 0 ? (
                <span className="text-xs text-slate-500">Sin datos suficientes.</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-prBlue" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
                Señales IA
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {signals.map((signal) => (
                <span
                  key={signal.label}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${signal.tone}`}
                >
                  {signal.label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
              Plataformas más activas
            </p>
            <div className="mt-2 space-y-2">
              {topPlatforms.map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">{platform}</span>
                  <span>{fullFormatter.format(count)} menciones</span>
                </div>
              ))}
              {!topPlatforms.length ? (
                <p className="text-xs text-slate-500">Sin datos de plataformas.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StreamPulse;
