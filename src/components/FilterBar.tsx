import type { FC } from "react";
import type { Platform, Sentiment } from "../types";
import SelectField from "./SelectField";

export type Timeframe = "24h" | "72h" | "7d" | "1m" | "todo";

export interface Filters {
  sentiment: Sentiment | "todos";
  platform: Platform | "todos";
  timeframe: Timeframe;
  cluster: string | "todos";
  subcluster: string | "todos";
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  filters: Filters;
  clusters: string[];
  subclusters: string[];
  onChange: (filters: Filters) => void;
}

const FilterBar: FC<Props> = ({ filters, clusters, subclusters, onChange }) => {
  const defaultReset: Filters = {
    sentiment: "todos",
    platform: "todos",
    timeframe: "todo",
    cluster: "todos",
    subcluster: "todos",
    dateFrom: undefined,
    dateTo: undefined,
  };

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const sentimentOptions: { value: Filters["sentiment"]; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "positivo", label: "Positivo" },
    { value: "neutral", label: "Neutral" },
    { value: "negativo", label: "Negativo" },
  ];

  const platformOptions: { value: Filters["platform"]; label: string }[] = [
    { value: "todos", label: "Todas" },
    { value: "X/Twitter", label: "X / Twitter" },
    { value: "Facebook", label: "Facebook" },
    { value: "Instagram", label: "Instagram" },
    { value: "YouTube", label: "YouTube" },
    { value: "TikTok", label: "TikTok" },
    { value: "Reddit", label: "Reddit" },
  ];

  const clusterOptions: { value: Filters["cluster"]; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...clusters.map((cluster) => ({ value: cluster, label: cluster })),
  ];

  const subclusterOptions: { value: Filters["subcluster"]; label: string }[] = [
    { value: "todos", label: "Todos" },
    ...subclusters.map((subcluster) => ({ value: subcluster, label: subcluster })),
  ];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-nowrap md:flex-wrap items-end gap-2 overflow-x-auto md:overflow-visible filters-scroll pb-1">
        <div className="filter-block min-w-[100px]">
          <SelectField
            label="Sentimiento"
            value={filters.sentiment}
            options={sentimentOptions}
            onChange={(value) => update("sentiment", value)}
            className="space-y-1.5"
          />
        </div>

        <div className="filter-block min-w-[100px]">
          <SelectField
            label="Plataforma"
            value={filters.platform}
            options={platformOptions}
            onChange={(value) => update("platform", value)}
            className="space-y-1.5"
          />
        </div>

        <div className="filter-block min-w-[110px]">
          <SelectField
            label="Núcleo"
            value={filters.cluster}
            options={clusterOptions}
            onChange={(value) => update("cluster", value)}
            className="space-y-1.5"
          />
        </div>

        <div className="filter-block min-w-[120px]">
          <SelectField
            label="Subcluster"
            value={filters.subcluster}
            options={subclusterOptions}
            onChange={(value) => update("subcluster", value)}
            className="space-y-1.5"
          />
        </div>

        <div className="filter-block filter-block-wide min-w-[180px]">
          <p className="muted text-slate-500">Horizonte</p>
          <div className="flex flex-nowrap gap-1.5">
            {["24h", "72h", "7d", "1m", "todo"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update("timeframe", value as Filters["timeframe"])}
                title={value === "todo" ? "Todo el histórico" : `Últimos ${value}`}
                aria-pressed={filters.timeframe === value}
                className={`h-10 px-2 rounded-lg text-[11px] font-semibold border transition flex items-center justify-center whitespace-nowrap ${
                  filters.timeframe === value
                    ? "bg-prBlue text-white border-prBlue"
                    : "bg-white text-slate-700 border-slate-200 hover:border-prBlue"
                }`}
              >
                {value === "todo" ? "Todo" : value}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-block min-w-[110px]">
          <p className="muted text-slate-500">Desde</p>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => update("dateFrom", e.target.value || undefined)}
            aria-label="Desde"
            className="filter-control pr-3"
            placeholder="2026-01-01"
          />
        </div>
        <div className="filter-block min-w-[110px]">
          <p className="muted text-slate-500">Hasta</p>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => update("dateTo", e.target.value || undefined)}
            aria-label="Hasta"
            className="filter-control pr-3"
            placeholder="2026-01-20"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange({ ...filters, ...defaultReset })}
          className="flex-none self-end h-10 px-2.5 text-[11px] font-semibold text-prBlue border border-slate-200 rounded-lg bg-white hover:bg-prBlue/10 transition whitespace-nowrap"
        >
          Reiniciar
        </button>
      </div>
    </section>
  );
};

export default FilterBar;
