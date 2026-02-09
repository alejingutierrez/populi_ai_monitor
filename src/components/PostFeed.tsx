import {
  ChatBubbleOvalLeftIcon,
  EllipsisVerticalIcon,
  EyeSlashIcon,
  FlagIcon,
  HeartIcon,
  MapPinIcon,
  SparklesIcon,
  SquaresPlusIcon,
  TagIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SocialPost } from "../types";

interface Props {
  posts: SocialPost[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  scrollClassName?: string;
  headerActions?: ReactNode;
  density?: "comfortable" | "compact";
  showMetaBadges?: boolean;
}

const sentimentColor = (sentiment: SocialPost["sentiment"]) => {
  switch (sentiment) {
    case "positivo":
      return "bg-green-50 text-green-700 border-green-200";
    case "negativo":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const compactFormatter = new Intl.NumberFormat("es-PR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompact = (value: number) => compactFormatter.format(value);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const topEntries = (map: Map<string, number>, limit = 3) =>
  Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

const PostFeedInner: FC<Props> = ({
  posts,
  eyebrow = "Feed Stream",
  title = "Hilos priorizados",
  subtitle,
  scrollClassName,
  headerActions,
  density = "comfortable",
  showMetaBadges = true,
}) => {
  const reduceMotion = useReducedMotion();
  const isCompact = density === "compact";
  const [isSmall, setIsSmall] = useState(false);
  const baseCount = isSmall ? 8 : 12;
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const actionButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const closeMenu = () => {
    setOpenMenuId(null);
    setMenuAnchor(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsSmall(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!openMenuId || typeof window === "undefined") return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-post-id="${openMenuId}"]`)) return;
      if (target.closest(`[data-menu-id="${openMenuId}"]`)) return;
      closeMenu();
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [openMenuId]);

  const feedIntel = useMemo(() => {
    const topicCount = new Map<string, number>();
    const clusterCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    const sentimentCount = { positivo: 0, neutral: 0, negativo: 0 };
    const clusterRecent = new Map<string, number>();
    const clusterPrev = new Map<string, number>();
    let latestTimestamp = 0;
    let totalReach = 0;
    let totalEngagement = 0;
    let maxReach = 0;
    let maxEngagement = 0;

    posts.forEach((post) => {
      const ts = new Date(post.timestamp).getTime();
      if (ts > latestTimestamp) latestTimestamp = ts;
      totalReach += post.reach;
      totalEngagement += post.engagement;
      maxReach = Math.max(maxReach, post.reach);
      maxEngagement = Math.max(maxEngagement, post.engagement);
      sentimentCount[post.sentiment] += 1;
      topicCount.set(post.topic, (topicCount.get(post.topic) ?? 0) + 1);
      clusterCount.set(post.cluster, (clusterCount.get(post.cluster) ?? 0) + 1);
      cityCount.set(post.location.city, (cityCount.get(post.location.city) ?? 0) + 1);
    });

    const end = latestTimestamp;
    const windowMs = 15 * 60 * 1000;
    const recentStart = end - windowMs;
    const prevStart = end - windowMs * 2;
    let recentCount = 0;
    let prevCount = 0;

    posts.forEach((post) => {
      const ts = new Date(post.timestamp).getTime();
      if (ts >= recentStart) {
        recentCount += 1;
        clusterRecent.set(post.cluster, (clusterRecent.get(post.cluster) ?? 0) + 1);
      } else if (ts >= prevStart) {
        prevCount += 1;
        clusterPrev.set(post.cluster, (clusterPrev.get(post.cluster) ?? 0) + 1);
      }
    });

    const clusterVelocity = new Map<
      string,
      { recent: number; prev: number; deltaPct: number }
    >();
    const clusters = new Set([
      ...clusterRecent.keys(),
      ...clusterPrev.keys(),
      ...clusterCount.keys(),
    ]);
    clusters.forEach((name) => {
      const recent = clusterRecent.get(name) ?? 0;
      const prev = clusterPrev.get(name) ?? 0;
      const deltaPct = ((recent - prev) / Math.max(1, prev)) * 100;
      clusterVelocity.set(name, { recent, prev, deltaPct });
    });

    const dominantSentiment = (() => {
      const entries = Object.entries(sentimentCount) as Array<[keyof typeof sentimentCount, number]>;
      return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
    })();

    return {
      latestTimestamp: end,
      totalReach,
      totalEngagement,
      avgReach: totalReach / Math.max(1, posts.length),
      avgEngagement: totalEngagement / Math.max(1, posts.length),
      maxReach,
      maxEngagement,
      recentCount,
      prevCount,
      velocityDelta: ((recentCount - prevCount) / Math.max(1, prevCount)) * 100,
      topTopics: topEntries(topicCount, 3),
      topClusters: topEntries(clusterCount, 3),
      topCities: topEntries(cityCount, 3),
      clusterVelocity,
      dominantSentiment,
    };
  }, [posts]);

  useEffect(() => {
    let raf = 0;
    const updateAnchor = () => {
      if (!openMenuId) return;
      const anchor = actionButtonRefs.current.get(openMenuId);
      setMenuAnchor(anchor ? anchor.getBoundingClientRect() : null);
    };
    const handleReflow = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateAnchor);
    };
    if (!openMenuId || typeof window === "undefined") return;
    const scroller = scrollAreaRef.current;
    window.addEventListener("resize", handleReflow);
    scroller?.addEventListener("scroll", handleReflow, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleReflow);
      scroller?.removeEventListener("scroll", handleReflow);
    };
  }, [openMenuId]);

  const maxPage = Math.max(1, Math.ceil(posts.length / Math.max(1, baseCount)));
  const visibleCount = Math.min(posts.length, baseCount * page);
  const items = posts.slice(0, visibleCount);
  const canShowMore = posts.length > visibleCount;

  const scorePost = (post: SocialPost) => {
    const reachScore = feedIntel.maxReach ? post.reach / feedIntel.maxReach : 0;
    const engagementScore = feedIntel.maxEngagement
      ? post.engagement / feedIntel.maxEngagement
      : 0;
    const sentimentScore =
      post.sentiment === "negativo" ? 1 : post.sentiment === "positivo" ? 0.7 : 0.4;
    const recencyScore = feedIntel.latestTimestamp
      ? clamp(1 - (feedIntel.latestTimestamp - new Date(post.timestamp).getTime()) / (6 * 60 * 60 * 1000), 0, 1)
      : 0.5;
    return Math.round(
      clamp(
        (reachScore * 0.35 + engagementScore * 0.3 + sentimentScore * 0.2 + recencyScore * 0.15) *
          100,
        0,
        100
      )
    );
  };

  const scoreTone = (score: number) => {
    if (score >= 75) {
      return { label: "Crítico", className: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (score >= 55) {
      return { label: "Alto", className: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { label: "Monitor", className: "bg-sky-50 text-sky-700 border-sky-200" };
  };

  const reasonPost = (post: SocialPost) => {
    const highReach = post.reach >= feedIntel.avgReach * 1.6;
    const highEngagement = post.engagement >= feedIntel.avgEngagement * 1.6;
    if (post.sentiment === "negativo" && highReach) return "Riesgo reputacional en expansión";
    if (post.sentiment === "positivo" && highEngagement) return "Oportunidad narrativa con tracción";
    if (post.sentiment === "negativo" && highEngagement) return "Hilo crítico con interacción alta";
    if (highReach) return "Cobertura amplia por alcance";
    if (highEngagement) return "Interacción elevada en el hilo";
    return "Mención relevante para seguimiento";
  };

  const menuWidth = 208;
  const menuHeight = 250;
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const canRenderMenu =
    openMenuId && menuAnchor && typeof document !== "undefined";
  const menuTop = menuAnchor
    ? menuAnchor.bottom + menuHeight > viewportHeight &&
      menuAnchor.top - menuHeight > 12
      ? menuAnchor.top - menuHeight - 8
      : menuAnchor.bottom + 8
    : 0;
  const menuLeft = menuAnchor
    ? Math.min(
        Math.max(12, menuAnchor.right - menuWidth),
        Math.max(12, viewportWidth - menuWidth - 12)
      )
    : 0;
  const lastActivityLabel = feedIntel.latestTimestamp
    ? new Date(feedIntel.latestTimestamp).toLocaleTimeString("es-PR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const fallbackSubtitle = `Mostrando ${items.length} de ${posts.length} · Última actividad ${lastActivityLabel}`;

  return (
    <section className={`card h-full min-w-0 ${isCompact ? "p-3" : "p-4"}`}>
      <div className="card-header mb-4 items-start gap-4 flex-col lg:flex-row lg:items-center">
        <div>
          <p className="muted">{eyebrow}</p>
          <p className="h-section">{title}</p>
          <p className="text-[11px] text-slate-500">{subtitle ?? fallbackSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {showMetaBadges ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                IA en vivo
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                {formatCompact(feedIntel.totalReach)} alcance
              </span>
              <span className="text-xs px-3 py-1 bg-prBlue/10 text-prBlue rounded-full font-semibold">
                {posts.length} encontrados
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 min-w-0">
        <div
          ref={scrollAreaRef}
          className={`space-y-3 overflow-y-auto pr-1 ${
            scrollClassName ?? "max-h-[45vh] md:max-h-[560px]"
          }`}
        >
          {items.map((post, idx) => {
            const score = scorePost(post);
            const tone = scoreTone(score);
            const reason = reasonPost(post);
            const velocity = feedIntel.clusterVelocity.get(post.cluster);
            const delta = velocity ? Math.round(velocity.deltaPct) : 0;

            return (
              <motion.article
                key={post.id}
                data-post-id={post.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: idx * 0.03 }}
                layout
                whileHover={reduceMotion ? undefined : { scale: 1.005 }}
                className={`relative border border-slate-200 rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ${
                  isCompact ? "p-2" : "p-3"
                }`}
              >
                  <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full bg-gradient-to-br from-prBlue to-prRed text-white font-semibold flex items-center justify-center ${
                        isCompact ? "h-8 w-8 text-xs" : "h-10 w-10"
                      }`}
                    >
                      {post.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{post.author}</p>
                        <p className="text-xs text-slate-500 flex gap-1 items-center flex-wrap">
                          <span>{post.platform}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">{post.handle}</span>
                          <span className="text-slate-300">•</span>
                          <span>
                            {new Date(post.timestamp).toLocaleString("es-PR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${sentimentColor(
                          post.sentiment
                        )}`}
                      >
                        {post.sentiment}
                      </span>
                      <span
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${tone.className}`}
                      >
                        IA {score} · {tone.label}
                      </span>
                      {isCompact ? null : (
                        <button
                          type="button"
                          onClick={() => {
                            if (openMenuId === post.id) {
                              closeMenu();
                              return;
                            }
                            const anchor = actionButtonRefs.current.get(post.id);
                            setMenuAnchor(anchor ? anchor.getBoundingClientRect() : null);
                            setOpenMenuId(post.id);
                          }}
                          ref={(node) => {
                            if (!node) {
                              actionButtonRefs.current.delete(post.id);
                              return;
                            }
                            actionButtonRefs.current.set(post.id, node);
                          }}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === post.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                        >
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <SparklesIcon className="h-4 w-4 text-prBlue" />
                      {reason}
                    </span>
                    {delta >= 35 ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 font-semibold">
                        Cluster +{delta}%
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={`text-sm text-slate-700 mt-2 leading-relaxed ${
                      isCompact ? "max-h-[3.2em] overflow-hidden" : "max-h-[4.5em] overflow-hidden md:max-h-none md:overflow-visible"
                    }`}
                    title={post.content}
                  >
                    {post.content}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="px-2 py-1 rounded-full bg-prBlue/10 text-prBlue font-semibold">
                      {post.topic}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-prGray text-slate-700">
                      {post.mediaType}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-prGray text-slate-700">
                      <MapPinIcon className="h-4 w-4 text-prBlue" />
                      {post.location.city}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                    {isCompact ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-prBlue/10 text-prBlue font-semibold border border-prBlue/30">
                        {post.cluster} · {post.subcluster}
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-prRed/10 text-prRed font-semibold border border-prRed/30">
                          Cluster {post.cluster}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-prBlue/10 text-prBlue font-semibold border border-prBlue/30">
                          Subcluster {post.subcluster}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          Micro {post.microcluster}
                        </span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                      <HeartIcon className="h-4 w-4 text-prRed" />
                      {post.engagement.toLocaleString("es-PR")} interacciones
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                      <ChatBubbleOvalLeftIcon className="h-4 w-4 text-prBlue" />
                      {post.reach.toLocaleString("es-PR")} alcance
                    </span>
                  </div>

              </motion.article>
            );
          })}
        </div>

        <div className="pt-3 flex flex-col sm:flex-row gap-2">
          {canShowMore ? (
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Mostrar más
            </button>
          ) : null}
          {visibleCount > baseCount ? (
            <button
              type="button"
              onClick={() => setPage(1)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Mostrar menos
            </button>
          ) : null}
        </div>
      </div>
      {canRenderMenu
        ? createPortal(
            <div
              role="menu"
              data-menu-id={openMenuId ?? undefined}
              className="fixed z-[120] w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
              style={{ top: menuTop, left: menuLeft }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <TagIcon className="h-4 w-4 text-slate-500" />
                Clasificar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-start gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <SquaresPlusIcon className="h-4 w-4 text-slate-500" />
                <span className="text-left">
                  Agregar a Núcleos
                  <span className="block text-[10px] text-slate-400">
                    cluster / subcluster / microcluster
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FlagIcon className="h-4 w-4 text-slate-500" />
                Priorizar hilo
              </button>
              <div className="divider" />
              <button
                type="button"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <EyeSlashIcon className="h-4 w-4 text-slate-500" />
                Ocultar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <TrashIcon className="h-4 w-4 text-rose-500" />
                Eliminar
              </button>
            </div>,
            document.body
          )
        : null}
    </section>
  );
};

const PostFeed: FC<Props> = (props) => {
  const density = props.density ?? "comfortable";
  const first = props.posts[0]?.id ?? "empty";
  const last = props.posts[props.posts.length - 1]?.id ?? "empty";
  const resetKey = `${density}:${props.posts.length}:${first}:${last}`;
  return <PostFeedInner key={resetKey} {...props} />;
};

export default PostFeed;
