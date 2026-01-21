import { ChatBubbleOvalLeftIcon, HeartIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type FC } from "react";
import type { SocialPost } from "../types";

interface Props {
  posts: SocialPost[];
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

const PostFeed: FC<Props> = ({ posts }) => {
  const reduceMotion = useReducedMotion();
  const [isSmall, setIsSmall] = useState(false);
  const baseCount = isSmall ? 8 : 12;
  const [visibleCount, setVisibleCount] = useState(baseCount);

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
    setVisibleCount(baseCount);
  }, [baseCount, posts.length]);

  const items = posts.slice(0, visibleCount);
  const canShowMore = posts.length > visibleCount;

  return (
    <section className="card p-4 h-full min-w-0">
      <div className="card-header mb-4">
        <div>
          <p className="muted">Conversaciones</p>
          <p className="h-section">Hilos priorizados</p>
          <p className="text-[11px] text-slate-500">
            Mostrando {items.length} de {posts.length}
          </p>
        </div>
        <span className="text-xs px-3 py-1 bg-prBlue/10 text-prBlue rounded-full font-semibold">
          {posts.length} encontrados
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[45vh] md:max-h-[560px] pr-1">
        {items.map((post, idx) => (
          <motion.article
            key={post.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: idx * 0.03 }}
            layout
            whileHover={reduceMotion ? undefined : { scale: 1.005 }}
            className="border border-slate-200 rounded-xl p-3 bg-gradient-to-br from-white to-slate-50 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-prBlue to-prRed text-white font-semibold flex items-center justify-center">
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
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${sentimentColor(post.sentiment)}`}>
                {post.sentiment}
              </span>
            </div>

            <p
              className="text-sm text-slate-700 mt-2 leading-relaxed max-h-[4.5em] overflow-hidden md:max-h-none md:overflow-visible"
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-prRed/10 text-prRed font-semibold border border-prRed/30">
                Núcleo {post.cluster}
              </span>
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
        ))}
      </div>

      <div className="pt-3 flex flex-col sm:flex-row gap-2">
        {canShowMore ? (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) => Math.min(posts.length, count + baseCount))
            }
            className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Mostrar más
          </button>
        ) : null}
        {visibleCount > baseCount ? (
          <button
            type="button"
            onClick={() => setVisibleCount(baseCount)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Mostrar menos
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default PostFeed;
