import { ChatBubbleBottomCenterTextIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useMemo, type FC } from "react";
import type { SocialPost } from "../types";
import type { ClusterStat } from "./TopicPanel";
import TopicPanel from "./TopicPanel";

interface Props {
  clusters: ClusterStat[];
  posts: SocialPost[];
}

const truncate = (value: string, max = 120) =>
  value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;

const SubConversationExplorer: FC<Props> = ({ clusters, posts }) => {
  const focusItems = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        positive: number;
        negative: number;
        neutral: number;
        micro: Map<string, number>;
        samples: SocialPost[];
      }
    >();

    posts.forEach((post) => {
      const entry = map.get(post.subcluster) ?? {
        count: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        micro: new Map<string, number>(),
        samples: [],
      };
      entry.count += 1;
      if (post.sentiment === "positivo") entry.positive += 1;
      if (post.sentiment === "negativo") entry.negative += 1;
      if (post.sentiment === "neutral") entry.neutral += 1;
      entry.micro.set(post.microcluster, (entry.micro.get(post.microcluster) ?? 0) + 1);
      if (entry.samples.length < 2) {
        entry.samples.push(post);
      }
      map.set(post.subcluster, entry);
    });

    return Array.from(map.entries())
      .map(([name, data]) => {
        const topMicro = Array.from(data.micro.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          ...data,
          topMicro: topMicro ? topMicro[0] : "—",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [posts]);

  const topFocus = focusItems[0];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
      <TopicPanel clusters={clusters} />

      <div className="card p-4 h-full min-w-0 flex flex-col gap-4">
        <div>
          <p className="muted">Feed Stream</p>
          <p className="h-section">Sub-conversaciones clave</p>
          <p className="text-xs text-slate-500 mt-1">
            Enfoca clusters, subclusters y microclusters con contexto IA.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-prBlue" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]">
              Resumen IA
            </p>
          </div>
          <div className="mt-2 text-xs text-slate-600 space-y-1">
            <p>
              {topFocus
                ? `Subcluster líder: ${topFocus.name} con ${topFocus.count.toLocaleString("es-PR")} menciones.`
                : "Sin subclusters destacados todavía."}
            </p>
            <p>
              {topFocus
                ? `Microcluster dominante: ${topFocus.topMicro}.`
                : "Selecciona un nodo en el treemap para profundizar."}
            </p>
            <p>
              {topFocus
                ? `Balance: ${topFocus.positive} positivas, ${topFocus.neutral} neutrales, ${topFocus.negative} negativas.`
                : "Pulso general por definir."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {focusItems.map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <span className="text-xs text-slate-500">{item.count.toLocaleString("es-PR")} menciones</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Microcluster top: {item.topMicro}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  Positivo {item.positive}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                  Neutral {item.neutral}
                </span>
                <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                  Negativo {item.negative}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {item.samples.map((sample) => (
                  <div key={sample.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-prBlue" />
                      <span>{sample.author}</span>
                      <span className="text-slate-300">•</span>
                      <span>{sample.platform}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-700">{truncate(sample.content, 140)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!focusItems.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Sin sub-conversaciones suficientes para mostrar.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default SubConversationExplorer;
