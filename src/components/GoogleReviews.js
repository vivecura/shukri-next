"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import useIsMobile from "@/hooks/useIsMobile";
import useLanguage from "@/hooks/useLanguage";

// ---------------------------------------------------------------------------
// Google-Bewertungen fuer die Startseite.
//
// - Die 5 Karten sind eine feste, handverlesene Auswahl (Shukris Wunsch:
//   staerkster erster Eindruck, Vielfalt statt nur Eisen, zwei laengere
//   Geschichten). Der Kartentext ist ein woertlicher Ausschnitt, der Klick
//   oeffnet die vollstaendige Bewertung auf Google.
// - Gesamtnote + Anzahl kommen LIVE aus Google (ueber /api/google-rating,
//   serverseitig, DSGVO-schonend). Fallback = letzter bekannter Stand, damit
//   der Abschnitt nie leer ist.
// ---------------------------------------------------------------------------

const GOOGLE_PROFILE_URL = "https://www.google.com/maps?cid=8647067204724293427";

// Fallback, falls die Live-Zahl (noch) nicht verfuegbar ist.
const FALLBACK = { rating: 5.0, count: 46 };

const REVIEWS = [
  {
    name: "Philip M.",
    color: "#43a9ab",
    text:
      "Er hat mir weit außerhalb von Blutwerten Impulse gegeben, die mir ganzheitlich weitergeholfen haben. Nun arbeite ich seit 2025 sehr intensiv mit Shukri auch in anderen Themengebieten, die mehr in Richtung Körperarbeit und Traumaverarbeitung gehen.",
  },
  {
    name: "rocky",
    color: "#2d8789",
    text:
      "Shukri bietet weit mehr als eine medizinische Behandlung. Er hört aufmerksam zu, nimmt sich Zeit für offene und wertschätzende Gespräche und erklärt auch komplexe medizinische Zusammenhänge auf eine verständliche und zugleich stärkende Weise.",
  },
  {
    name: "Nora B.",
    color: "#1f6e70",
    text:
      "Vor allem hatte ich das Gefühl, wirklich gesehen und ernst genommen zu werden. Er hat sich viel Zeit genommen, aufmerksam zugehört und sehr ausführlich nachgefragt, um sich ein umfassendes Bild von meinen Beschwerden zu machen. Das hat mir das Gefühl gegeben, dass er die Ursache finden möchte und nicht nur die Symptome behandelt.",
  },
  {
    name: "Stefanie A.",
    color: "#b8956a",
    text:
      "Ich fühlte mich sofort verstanden und man nahm mich ernst. Direkt wurden die Ergebnisse aktueller Studien angesprochen und ein ausführliches Blutbild erstellt. Die Behandlung ist immer auf Augenhöhe und individuell zugeschnitten.",
  },
  {
    name: "Elisa W.",
    color: "#3a5a5b",
    text:
      "Erstklassiger Mediziner! Schon bei meinem ersten Besuch hat mich seine Fähigkeit begeistert, in komplexen Situationen schnell Zusammenhänge zu erkennen. Er hat meine persönliche Situation sofort tiefgehend erfasst und direkt effektive Lösungen gefunden.",
  },
];

function Star({ size = 16, filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? "#f5b400" : "#e2e6e6"} aria-hidden="true">
      <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.37 1.12l1.07 3.29c.3.92-.75 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.17 0l-2.8 2.03c-.79.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.37-1.12L2.5 9.42c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69L9.05 2.93z" />
    </svg>
  );
}

function GoogleGlyph({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function ReviewCard({ review, labels, extraClass = "" }) {
  const initial = review.name.charAt(0).toUpperCase();
  return (
    <a
      href={GOOGLE_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`googlereviews-card ${extraClass}`}
    >
      <div className="googlereviews-top">
        <span className="googlereviews-avatar" style={{ background: review.color }}>{initial}</span>
        <span className="googlereviews-name">{review.name}</span>
        <GoogleGlyph className="googlereviews-g" />
      </div>
      <div className="googlereviews-stars">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} />)}
      </div>
      <p className="googlereviews-text">{review.text}</p>
      <span className="googlereviews-foot">
        {labels.read}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}

export default function GoogleReviews({ speedSeconds = 64 }) {
  const t = useT();
  const lang = useLanguage();
  const isMobile = useIsMobile();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [agg, setAgg] = useState(FALLBACK);

  const labels =
    lang === "en"
      ? { read: "Read on Google", all: "See all reviews on Google", reviews: "reviews on Google" }
      : { read: "Auf Google lesen", all: "Alle Bewertungen auf Google ansehen", reviews: "Bewertungen auf Google" };

  useEffect(() => {
    let alive = true;
    fetch("/api/google-rating")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.rating === "number" && typeof d.count === "number") {
          setAgg({ rating: d.rating, count: d.count });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 1;
        const gap = 16;
        const idx = Math.round(el.scrollLeft / (cardWidth + gap));
        setActiveIndex(Math.max(0, Math.min(REVIEWS.length - 1, idx)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 0;
    const gap = 16;
    el.scrollTo({ left: i * (cardWidth + gap), behavior: "smooth" });
  };

  const ratingLabel = Number(agg.rating).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const roundedRating = Math.round(Number(agg.rating));

  return (
    <section className="py-10 sm:py-14 bg-white overflow-hidden">
      <div className="px-5 sm:px-10 mb-10 sm:mb-14 max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2
            className="text-[#43A9AB] font-black leading-[0.9] tracking-tighter"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}
          >
            {t("healthCheck.testimonialsSection.title")}
          </h2>
          <a
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all no-underline"
            aria-label={`${ratingLabel} von 5, ${agg.count} ${labels.reviews}`}
          >
            <span className="flex flex-col leading-none">
              <span className="text-[22px] font-extrabold text-[#1a1f24] tabular-nums">{ratingLabel}</span>
              <span className="flex gap-[1px] mt-[3px]">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} filled={i < roundedRating} />)}
              </span>
              <span className="text-[12px] text-[#7b8483] mt-[3px] font-medium">
                {agg.count} {labels.reviews}
              </span>
            </span>
            <span className="w-px h-9 bg-gray-200" />
            <GoogleGlyph className="w-[26px] h-[26px]" />
          </a>
        </div>
      </div>

      {isMobile ? (
        <>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto px-5 pb-2 googlereviews-swipe"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollPaddingLeft: "20px" }}
          >
            {REVIEWS.map((review, i) => (
              <ReviewCard key={i} review={review} labels={labels} extraClass="googlereviews-card--mobile" />
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-5">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`Bewertung ${i + 1}`}
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
        <div className="googlereviews-marquee">
          <div className="googlereviews-track" style={{ animationDuration: `${speedSeconds}s` }}>
            {[...REVIEWS, ...REVIEWS].map((review, i) => (
              <ReviewCard key={i} review={review} labels={labels} extraClass="googlereviews-card--desktop" />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-5 sm:px-10 mt-9 sm:mt-12 text-center">
        <a
          href={GOOGLE_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[#43A9AB] font-semibold text-sm sm:text-base hover:gap-3 transition-all no-underline"
        >
          {labels.all}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <style>{`
        .googlereviews-card {
          box-sizing: border-box;
          background: #fff;
          border: 1px solid rgba(81,87,87,0.10);
          border-radius: 18px;
          padding: 22px 22px 18px;
          text-decoration: none;
          color: #515757;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 14px -8px rgba(20,40,40,.25);
          transition: box-shadow .3s ease, transform .3s ease, border-color .3s ease;
          min-height: 272px;
          flex-shrink: 0;
        }
        .googlereviews-card--desktop { width: 340px; }
        .googlereviews-card--mobile { width: 82vw; max-width: 320px; scroll-snap-align: start; }
        .googlereviews-card:hover {
          box-shadow: 0 18px 40px -18px rgba(20,40,40,.42);
          transform: translateY(-4px);
          border-color: rgba(67,169,171,0.35);
        }
        .googlereviews-top { display: flex; align-items: center; gap: 12px; }
        .googlereviews-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 18px;
          flex-shrink: 0;
        }
        .googlereviews-name { font-size: 15px; font-weight: 700; color: #2c3131; flex: 1; min-width: 0; }
        .googlereviews-g { width: 20px; height: 20px; flex-shrink: 0; }
        .googlereviews-stars { display: flex; gap: 2px; margin: 14px 0 10px; }
        .googlereviews-text {
          font-size: 14.5px; line-height: 1.62; color: #565c5c; margin: 0; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;
        }
        .googlereviews-foot {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 14px;
          color: #43a9ab; font-weight: 600; font-size: 13.5px;
        }
        .googlereviews-foot svg { transition: transform .25s ease; }
        .googlereviews-card:hover .googlereviews-foot svg { transform: translateX(3px); }

        .googlereviews-marquee {
          position: relative; width: 100%; overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
        }
        .googlereviews-track {
          display: flex; gap: 34px; width: max-content; padding: 8px 40px;
          animation-name: googlereviewsScroll; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        .googlereviews-marquee:hover .googlereviews-track { animation-play-state: paused; }
        @keyframes googlereviewsScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .googlereviews-swipe::-webkit-scrollbar { display: none; }
        .googlereviews-swipe { scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          .googlereviews-track { animation: none; }
        }
      `}</style>
    </section>
  );
}
