import {
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
  ChartBarIcon,
  GlobeAmericasIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import type { FC } from "react";

const navItems = [
  { label: "Panorama", icon: ChartBarIcon },
  { label: "Rios de datos", icon: GlobeAmericasIcon },
  { label: "Mapa vivo", icon: MapIcon },
  { label: "Núcleos y grafos", icon: AdjustmentsHorizontalIcon },
  { label: "Alertas", icon: BellAlertIcon },
];

const Sidebar: FC = () => {
  return (
    <aside className="hidden lg:flex w-72 flex-col bg-white/90 backdrop-blur border-r border-slate-200 shadow-[12px_0_35px_rgba(15,23,42,0.06)] h-screen sticky top-0 overflow-y-auto">
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-prBlue to-prRed flex items-center justify-center text-white font-bold shadow-lg">
          AI
        </div>
        <div>
          <p className="text-sm text-prBlue font-semibold">Populi Monitor</p>
          <p className="text-xs text-slate-500">Puerto Rico en tiempo real</p>
        </div>
      </div>

      <nav className="px-4 space-y-1 mt-2">
        {navItems.map(({ label, icon: Icon }, idx) => (
          <motion.button
            key={label}
            whileHover={{ x: 4 }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left ${
              idx === 0
                ? "bg-prBlue text-white shadow-md"
                : "text-slate-700 hover:bg-prGray"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{label}</span>
          </motion.button>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;
