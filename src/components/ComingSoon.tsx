import type { FC } from "react";

interface Props {
  title: string;
  description?: string;
}

const ComingSoon: FC<Props> = ({ title, description }) => (
  <main className="p-4 md:p-6">
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
