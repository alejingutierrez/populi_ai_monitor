import {
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
  ChartBarIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  GlobeAmericasIcon,
  MapIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import type { FC } from "react";

const navItems = [
  { label: "Overview", icon: ChartBarIcon },
  { label: "Feed Stream", icon: GlobeAmericasIcon },
  { label: "Geo Tagging", icon: MapIcon },
  { label: "Network Connections", icon: AdjustmentsHorizontalIcon },
  { label: "Alerts", icon: BellAlertIcon },
];

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  activeItem?: string;
  onNavigate?: (label: string) => void;
}

const Sidebar: FC<Props> = ({
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
  activeItem,
  onNavigate,
}) => {
  const isCollapsed = Boolean(collapsed);
  const canToggle = Boolean(onToggleCollapse);
  const renderNav = (onItemClick?: () => void) => (
    <nav className={`px-4 space-y-1 mt-2 ${isCollapsed ? "px-2" : "px-4"}`}>
      {navItems.map(({ label, icon: Icon }, idx) => {
        const isActive = activeItem ? activeItem === label : idx === 0;
        return (
          <motion.button
            key={label}
            type="button"
            aria-current={isActive ? "page" : undefined}
            whileHover={{ x: 4 }}
            onClick={() => {
              onNavigate?.(label);
              onItemClick?.();
            }}
            aria-label={label}
            title={label}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left ${
              isActive
                ? "bg-prBlue text-white shadow-md"
                : "text-slate-700 hover:bg-prGray"
            }`}
          >
            <Icon className="h-5 w-5" />
            {!isCollapsed ? (
              <span className="text-sm font-medium">{label}</span>
            ) : (
              <span className="sr-only">{label}</span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex ${isCollapsed ? "w-20" : "w-72"} flex-col bg-white/90 backdrop-blur border-r border-slate-200 shadow-[12px_0_35px_rgba(15,23,42,0.06)] h-screen sticky top-0 overflow-y-auto transition-all duration-200`}
      >
        <div className={`px-6 pt-6 pb-4 flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-prBlue to-prRed flex items-center justify-center text-white font-bold shadow-lg">
            AI
          </div>
          {!isCollapsed ? (
            <div>
              <p className="text-sm text-prBlue font-semibold">Populi Monitor</p>
              <p className="text-xs text-slate-500">Puerto Rico en tiempo real</p>
            </div>
          ) : null}
        </div>

        {renderNav()}

        <div className={`mt-auto ${isCollapsed ? "px-2" : "px-4"} pb-6`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            disabled={!canToggle}
            aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm ${
              canToggle ? "hover:bg-slate-50" : "opacity-60 cursor-not-allowed"
            }`}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4" />
            ) : (
              <>
                <ChevronDoubleLeftIcon className="h-4 w-4" />
                Contraer
              </>
            )}
          </button>
        </div>
      </aside>

      {isOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white/95 backdrop-blur border-r border-slate-200 shadow-[12px_0_35px_rgba(15,23,42,0.12)] overflow-y-auto">
            <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-prBlue to-prRed flex items-center justify-center text-white font-bold shadow-lg">
                  AI
                </div>
                <div>
                  <p className="text-sm text-prBlue font-semibold">Populi Monitor</p>
                  <p className="text-xs text-slate-500">Puerto Rico en tiempo real</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {renderNav(onClose)}
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default Sidebar;
