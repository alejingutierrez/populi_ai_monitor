import type { FC } from "react";
import SummaryGrid, { type SummaryMetrics } from "./SummaryGrid";

interface Props {
  title: string;
  description?: string;
  metrics?: SummaryMetrics;
}

const ComingSoon: FC<Props> = ({ title, description, metrics }) => (
  <main className="p-4 md:p-6 space-y-6 overflow-y-auto">
    {metrics ? <SummaryGrid metrics={metrics} /> : null}
    <section className="card p-6 text-center space-y-2">
      <p className="muted">En construcción</p>
      <p className="h-section">{title}</p>
      <p className="text-sm text-slate-500">
        {description ?? "Estamos preparando esta sección para el siguiente sprint."}
      </p>
    </section>
  </main>
);

export default ComingSoon;
