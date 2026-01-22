import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type FC } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const InsightModal: FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
                  Insight request
                </p>
                <h2 className="text-2xl font-semibold text-ink mt-1">
                  Pedir insight
                </h2>
                <p className="text-sm text-slate-600 mt-2">
                  Define el enfoque para priorizar el análisis y activar el flujo de IA.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Tipo de insight</span>
                <select className="filter-control">
                  <option>Resumen ejecutivo</option>
                  <option>Riesgo reputacional</option>
                  <option>Oportunidades de acción</option>
                  <option>Alertas tempranas</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Horizonte</span>
                <select className="filter-control">
                  <option>Últimas 24 horas</option>
                  <option>Últimos 7 días</option>
                  <option>Últimos 30 días</option>
                  <option>Rango personalizado</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Prioridad</span>
                <select className="filter-control">
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Nivel de detalle</span>
                <select className="filter-control">
                  <option>Panorama general</option>
                  <option>Cluster + subcluster</option>
                  <option>Microcluster profundo</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Contexto o solicitud</span>
              <textarea
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-prBlue focus:outline-none focus:ring-1 focus:ring-prBlue/30"
                placeholder="Describe la pregunta clave, campañas o eventos relevantes."
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                IA lista para generar insight en segundos
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-prBlue px-4 py-2 text-sm font-semibold text-white shadow-glow border border-prBlue/80 hover:brightness-110"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generar insight
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default InsightModal;
