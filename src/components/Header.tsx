import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import type { FC } from "react";
import type { Topic } from "../types";
import FilterBar, { type Filters } from "./FilterBar";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  filters: Filters;
  topics: Topic[];
  clusters: string[];
  onFiltersChange: (filters: Filters) => void;
}

const Header: FC<Props> = ({
  search,
  onSearch,
  filters,
  topics,
  clusters,
  onFiltersChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col gap-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
            Dashboard IA
          </p>
          <h1 className="text-2xl font-semibold text-ink">
            Monitoreo social Puerto Rico
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-prGray px-3 py-2 rounded-xl shadow-sm text-sm text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            Alimentación en vivo
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 bg-prBlue text-white px-3 py-2 rounded-xl shadow-glow text-sm font-medium border border-prBlue/80 hover:brightness-110"
          >
            <SparklesIcon className="h-4 w-4" />
            Pedir insight
          </motion.button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative flex-1">
          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar términos, autores, municipios o temas"
            className="w-full bg-white border border-prGray rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-inner focus:border-prBlue focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => onSearch(search.trim())}
          className="inline-flex items-center gap-2 rounded-xl bg-prBlue px-4 py-2.5 text-sm font-semibold text-white shadow-glow border border-prBlue/80 hover:brightness-110 transition"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          Buscar
        </button>
      </div>

      <FilterBar
        filters={filters}
        topics={topics}
        clusters={clusters}
        onChange={onFiltersChange}
      />
    </header>
  );
};

export default Header;
