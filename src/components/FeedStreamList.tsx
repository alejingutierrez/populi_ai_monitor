import { useMemo, useState, type FC } from "react";
import PostFeed from "./PostFeed";
import type { SocialPost } from "../types";

interface Props {
  posts: SocialPost[];
}

type SortKey = "recency" | "reach" | "engagement" | "impact";

const sortLabels: Record<SortKey, string> = {
  recency: "Más recientes",
  reach: "Mayor alcance",
  engagement: "Mayor engagement",
  impact: "Impacto IA",
};

const FeedStreamList: FC<Props> = ({ posts }) => {
  const [sortBy, setSortBy] = useState<SortKey>("recency");

  const sortedPosts = useMemo(() => {
    const base = [...posts];
    const byTimestamp = (a: SocialPost, b: SocialPost) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

    if (sortBy === "recency") {
      return base.sort(byTimestamp);
    }

    if (sortBy === "reach") {
      return base.sort((a, b) => b.reach - a.reach || byTimestamp(a, b));
    }

    if (sortBy === "engagement") {
      return base.sort((a, b) => b.engagement - a.engagement || byTimestamp(a, b));
    }

    return base.sort((a, b) => {
      const impactA = a.reach * 0.6 + a.engagement * 0.4;
      const impactB = b.reach * 0.6 + b.engagement * 0.4;
      return impactB - impactA || byTimestamp(a, b);
    });
  }, [posts, sortBy]);

  return (
    <PostFeed
      posts={sortedPosts}
      eyebrow="Feed Stream"
      title="Hilos completos"
      subtitle={`Orden actual: ${sortLabels[sortBy]} · ${sortedPosts.length.toLocaleString("es-PR")} menciones`}
      scrollClassName="max-h-[60vh] md:max-h-[720px]"
      headerActions={
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Orden</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
        </div>
      }
    />
  );
};

export default FeedStreamList;
