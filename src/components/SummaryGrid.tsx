import { ArrowTrendingUpIcon, FireIcon, GlobeAmericasIcon } from "@heroicons/react/24/outline";
import {
  AdjustmentsVerticalIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import type { FC, ReactNode } from "react";

interface Props {
  metrics: {
    totalPosts: number;
    reach: number;
    avgEngagement: number;
    topTopic: string;
    topCities: string[];
    deltas: {
      totalPct: number;
      reachPct: number;
      engagementPct: number;
      sentimentPct: number;
      reputationPct: number;
      polarizationPct: number;
      viralPropensityPct: number;
    };
    reputationalRisk: number;
    polarization: number;
    viralPropensity: number;
    sentimentIndex: number;
  };
}

const SummaryGrid: FC<Props> = ({ metrics }) => {
  const reduceMotion = useReducedMotion();
  const getTrendTone = (delta: number, prefersLower = false) => {
    const safeDelta = Number.isFinite(delta) ? delta : 0;
    const isImprovement = prefersLower ? safeDelta <= 0 : safeDelta >= 0;
    return {
      arrow: safeDelta >= 0 ? "▲" : "▼",
      value: Math.abs(safeDelta).toFixed(1),
      tone: isImprovement
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-rose-50 text-rose-700 border-rose-200",
    };
  };

  const fullFormatter = new Intl.NumberFormat("es-PR");
  const compactFormatter = new Intl.NumberFormat("es-PR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });
  const formatCompact = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value) < 1000) return fullFormatter.format(Math.round(value));
    return compactFormatter.format(value);
  };

  type Card = {
    label: string;
    value: string;
    valueTitle?: string;
    accent: string;
    delta: number;
    preferLower?: boolean;
    icon: ReactNode;
  };

  const cards: Card[] = [
    {
      label: "Publicaciones",
      value: formatCompact(metrics.totalPosts),
      valueTitle: fullFormatter.format(metrics.totalPosts),
      accent: "from-prBlue to-prBlue/90",
      delta: metrics.deltas.totalPct,
      icon: <GlobeAmericasIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Alcance estimado",
      value: formatCompact(metrics.reach),
      valueTitle: fullFormatter.format(metrics.reach),
      accent: "from-prRed to-prBlue",
      delta: metrics.deltas.reachPct,
      icon: <FireIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Engagement prom.",
      value: formatCompact(metrics.avgEngagement),
      valueTitle: fullFormatter.format(Math.round(metrics.avgEngagement)),
      accent: "from-prBlue to-prRed",
      delta: metrics.deltas.engagementPct,
      icon: <ArrowTrendingUpIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Índice de sentimiento",
      value: `${metrics.sentimentIndex.toFixed(1)} / 100`,
      accent: "from-emerald-500 to-teal-500",
      delta: metrics.deltas.sentimentPct,
      icon: <ArrowTrendingUpIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Índice riesgo reputacional",
      value: `${metrics.reputationalRisk.toFixed(1)} / 100`,
      accent: "from-orange-400 to-red-500",
      preferLower: true,
      delta: metrics.deltas.reputationPct,
      icon: <ExclamationTriangleIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Polarización",
      value: `${metrics.polarization.toFixed(1)} / 100`,
      accent: "from-amber-500 to-blue-500",
      preferLower: true,
      delta: metrics.deltas.polarizationPct,
      icon: <AdjustmentsVerticalIcon className="size-6 text-white shrink-0" />,
    },
    {
      label: "Propensión a viralidad",
      value: `${metrics.viralPropensity.toFixed(1)} / 100`,
      accent: "from-indigo-500 to-cyan-500",
      delta: metrics.deltas.viralPropensityPct,
      icon: <RocketLaunchIcon className="size-6 text-white shrink-0" />,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          className="card p-4 relative overflow-hidden min-h-[150px] flex flex-col gap-3 justify-between"
        >
          <div
            className={`absolute inset-x-4 top-3 h-8 rounded-full bg-gradient-to-r ${card.accent} opacity-20 blur-xl`}
          />
          <div
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="muted">{card.label}</p>
              <p
                className="text-[clamp(1.15rem,0.6vw+0.9rem,1.4rem)] font-semibold text-ink leading-tight tracking-tight"
                title={card.valueTitle}
              >
                {card.value}
              </p>
            </div>
            <div
              className={`metric-icon-box bg-gradient-to-br ${card.accent}`}
            >
              {card.icon}
            </div>
          </div>
          <div className="flex items-center">
            {(() => {
              const trend = getTrendTone(card.delta, card.preferLower);
              return (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${trend.tone}`}
                >
                  {trend.arrow} {trend.value}% vs. periodo previo
                </span>
              );
            })()}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default SummaryGrid;
