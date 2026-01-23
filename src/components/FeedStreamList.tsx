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

type FocusKey = "all" | "critical" | "negative" | "media" | "impact";

const FeedStreamList: FC<Props> = ({ posts }) => {
  const [sortBy, setSortBy] = useState<SortKey>("recency");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [focus, setFocus] = useState<FocusKey>("all");

  const impactScores = useMemo(
    () => posts.map((post) => post.reach * 0.6 + post.engagement * 0.4).sort((a, b) => a - b),
    [posts]
  );
  const quantile = (arr: number[], q: number) => {
    if (!arr.length) return 0;
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return arr[base + 1] !== undefined ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
  };
  const impactThreshold = quantile(impactScores, 0.8);
  const criticalThreshold = quantile(impactScores, 0.92);

  const scoredPosts = useMemo(
    () =>
      posts.map((post) => {
        const impactScore = post.reach * 0.6 + post.engagement * 0.4;
        const highImpact = impactScore >= impactThreshold;
        const critical =
          impactScore >= criticalThreshold ||
          (post.sentiment === "negativo" && impactScore >= impactThreshold);
        return {
          post,
          impactScore,
          highImpact,
          critical,
          negative: post.sentiment === "negativo",
          media: post.mediaType !== "texto",
        };
      }),
    [criticalThreshold, impactThreshold, posts]
  );

  const focusCounts = useMemo(() => {
    const counts: Record<FocusKey, number> = {
      all: scoredPosts.length,
      critical: 0,
      negative: 0,
      media: 0,
      impact: 0,
    };
    scoredPosts.forEach((item) => {
      if (item.critical) counts.critical += 1;
      if (item.negative) counts.negative += 1;
      if (item.media) counts.media += 1;
      if (item.highImpact) counts.impact += 1;
    });
    return counts;
  }, [scoredPosts]);

  const filteredPosts = useMemo(() => {
    const filtered = scoredPosts.filter((item) => {
      if (focus === "critical") return item.critical;
      if (focus === "negative") return item.negative;
      if (focus === "media") return item.media;
      if (focus === "impact") return item.highImpact;
      return true;
    });
    return filtered.map((item) => item.post);
  }, [focus, scoredPosts]);

  const sortedPosts = useMemo(() => {
    const base = [...filteredPosts];
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
  }, [filteredPosts, sortBy]);

  const focusOptions: Array<{
    key: FocusKey;
    label: string;
    tone: string;
  }> = [
    { key: "all", label: "Todo", tone: "bg-slate-100 text-slate-600" },
    { key: "critical", label: "Critico IA", tone: "bg-rose-50 text-rose-700" },
    { key: "negative", label: "Negativo", tone: "bg-amber-50 text-amber-700" },
    { key: "media", label: "Multimedia", tone: "bg-indigo-50 text-indigo-700" },
    { key: "impact", label: "Alto impacto", tone: "bg-sky-50 text-sky-700" },
  ];

  return (
    <PostFeed
      posts={sortedPosts}
      eyebrow="Feed Stream"
      title="Hilos completos"
      subtitle={`Orden actual: ${sortLabels[sortBy]} · ${sortedPosts.length.toLocaleString("es-PR")} menciones`}
      scrollClassName="max-h-[60vh] md:max-h-[720px]"
      density={density}
      showMetaBadges={false}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Densidad</span>
            <select
              value={density}
              onChange={(event) => setDensity(event.target.value as "comfortable" | "compact")}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="comfortable">Normal</option>
              <option value="compact">Compacto</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {focusOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFocus(option.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                  focus === option.key
                    ? "border-prBlue bg-prBlue/10 text-prBlue"
                    : `border-transparent ${option.tone}`
                }`}
              >
                {option.label} · {focusCounts[option.key]}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
};

export default FeedStreamList;
