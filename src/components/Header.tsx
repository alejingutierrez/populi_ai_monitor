import {
  Bars3Icon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import type { FC } from "react";
import FilterBar, { type Filters } from "./FilterBar";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  filters: Filters;
  platforms: string[];
  clusters: string[];
  subclusters: string[];
  onFiltersChange: (filters: Filters) => void;
  onToggleNav?: () => void;
  onOpenInsight?: () => void;
  eyebrow?: string;
  title?: string;
}

const Header: FC<Props> = ({
  search,
  onSearch,
  filters,
  platforms,
  clusters,
  subclusters,
  onFiltersChange,
  onToggleNav,
  onOpenInsight,
  eyebrow = "Dashboard IA",
  title = "Monitoreo social Puerto Rico",
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col gap-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleNav}
            className="lg:hidden mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Abrir navegación"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div>
          <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold text-ink">
            {title}
          </h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-prGray px-3 py-2 rounded-xl shadow-sm text-sm text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            Alimentación en vivo
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onOpenInsight}
            className="inline-flex items-center gap-2 bg-prBlue text-white px-3 py-2 rounded-xl shadow-glow text-sm font-medium border border-prBlue/80 hover:brightness-110"
          >
            <SparklesIcon className="h-4 w-4" />
            Pedir insight
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label className="relative flex-1">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar términos, autores, municipios o temas"
            aria-label="Buscar en conversaciones"
            className="w-full bg-white border border-prGray rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-inner focus:border-prBlue focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => onSearch(search.trim())}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-prBlue px-4 py-2.5 text-sm font-semibold text-white shadow-glow border border-prBlue/80 hover:brightness-110 transition"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          Buscar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <div className="flex items-center gap-2 bg-white border border-prGray px-3 py-1.5 rounded-xl shadow-sm text-xs text-slate-700">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Alimentación en vivo
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onOpenInsight}
          className="inline-flex items-center gap-2 bg-prBlue text-white px-3 py-1.5 rounded-xl shadow-glow text-xs font-semibold border border-prBlue/80 hover:brightness-110"
        >
          <SparklesIcon className="h-4 w-4" />
          Pedir insight
        </motion.button>
      </div>

      <FilterBar
        filters={filters}
        platforms={platforms}
        clusters={clusters}
        subclusters={subclusters}
        onChange={onFiltersChange}
      />
    </header>
  );
};

export default Header;
