import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useIsMobile from "../hooks/useIsMobile";
import useLanguage from "../hooks/useLanguage";
import { fetchFeaturedPostsForLanguage } from "../lib/blogQueries";

export default function ScrollingCards({ speedSeconds = 36, title }) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const resolvedTitle = title === undefined ? t("scrollingCards.title") : title;
  const [posts, setPosts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobile = useIsMobile();
  const scrollerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchFeaturedPostsForLanguage(lang);
      setPosts(data);
    };
    load();
  }, [lang]);

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 1;
        const gap = 16;
        const idx = Math.round(el.scrollLeft / (cardWidth + gap));
        setActiveIndex(Math.max(0, Math.min(posts.length - 1, idx)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isMobile, posts.length]);

  if (posts.length === 0) return null;

  const scrollToIndex = (i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 0;
    const gap = 16;
    el.scrollTo({ left: i * (cardWidth + gap), behavior: "smooth" });
  };

  const renderCard = (post, key, extraClass = "") => (
    <Link
      key={key}
      to={lang === "en" ? `/en/blog/${post.slug}` : `/blog/${post.slug}`}
      className={`shrink-0 rounded-2xl overflow-hidden shadow-md border border-[#515757]/10 bg-white flex flex-col no-underline transition-all duration-300 ${extraClass}`}
    >
      <div className="w-full h-44 sm:h-48 bg-[#e0f4f5] overflow-hidden">
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#43a9ab]/40">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg sm:text-xl font-bold text-[#515757] mb-2 leading-tight line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-sm text-[#515757]/70 leading-relaxed line-clamp-3 flex-1">
            {post.description}
          </p>
        )}
        <span className="inline-flex items-center gap-1 text-[#43a9ab] font-semibold text-sm mt-3">
          {t("scrollingCards.readArticle")}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );

  return (
    <section className="py-24 sm:py-32 bg-white overflow-hidden">
      {resolvedTitle && (
        <div className="max-w-7xl mx-auto px-5 sm:px-10 mb-16 sm:mb-20">
          <h2
            className="text-[#43A9AB] font-black leading-[0.95] tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}
          >
            {resolvedTitle}
          </h2>
        </div>
      )}

      {isMobile ? (
        <>
          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto px-5 pb-2 scrollingCardsSwipe"
            style={{
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
              scrollPaddingLeft: "20px",
            }}
          >
            {posts.map((post, i) =>
              renderCard(
                post,
                post.id,
                "w-[82vw] max-w-[320px] h-[380px]"
              )
            )}
          </div>
          <div className="flex justify-center gap-2 mt-5">
            {posts.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`${t("scrollingCards.articleAriaLabel")} ${i + 1}`}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? 20 : 8,
                  backgroundColor: i === activeIndex ? "#43A9AB" : "rgba(81,87,87,0.25)",
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="group relative w-full">
          <div
            className="flex gap-10 sm:gap-14 w-max"
            style={{ animation: `scrollingCardsLoop ${speedSeconds}s linear infinite` }}
          >
            {[...posts, ...posts].map((post, i) =>
              renderCard(
                post,
                `${post.id}-${i}`,
                "w-[280px] sm:w-[320px] h-[380px] sm:h-[420px] hover:shadow-xl hover:-translate-y-1"
              )
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-5 sm:px-10 mt-10 sm:mt-14 text-center">
        <Link
          to={lang === "en" ? "/en/blog" : "/blog"}
          className="inline-flex items-center gap-2 text-[#43A9AB] font-semibold text-sm sm:text-base hover:gap-3 transition-all no-underline"
        >
          {t("scrollingCards.viewAll")}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <style>{`
        @keyframes scrollingCardsLoop {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .group:hover > div[style*="scrollingCardsLoop"] {
          animation-play-state: paused !important;
        }
        .scrollingCardsSwipe > * {
          scroll-snap-align: start;
        }
        .scrollingCardsSwipe::-webkit-scrollbar { display: none; }
        .scrollingCardsSwipe { scrollbar-width: none; }
      `}</style>
    </section>
  );
}
