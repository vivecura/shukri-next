import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import useLanguage from "../hooks/useLanguage";

function useScrollFadeIn() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : "translateY(40px)",
      transition: "opacity 1.4s ease-out, transform 1.4s ease-out",
    },
  };
}

function FlipCard({ title, image, desc, bgColor, href, flipped, onFlip, onUnflip }) {
  const { t } = useTranslation();
  const [isTouch, setIsTouch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hasBack = Boolean(desc);
  const setFlipped = (v) => {
    const next = typeof v === "function" ? v(flipped) : v;
    if (next) onFlip && onFlip();
    else onUnflip && onUnflip();
  };

  useEffect(() => {
    const hoverMql = window.matchMedia("(hover: none) or (pointer: coarse)");
    const mobileMql = window.matchMedia("(max-width: 639px)");
    setIsTouch(hoverMql.matches);
    setIsMobile(mobileMql.matches);

    const hoverHandler = (e) => setIsTouch(e.matches);
    const mobileHandler = (e) => setIsMobile(e.matches);
    const bind = (mql, h) => (mql.addEventListener ? mql.addEventListener("change", h) : mql.addListener(h));
    const unbind = (mql, h) => (mql.removeEventListener ? mql.removeEventListener("change", h) : mql.removeListener(h));
    bind(hoverMql, hoverHandler);
    bind(mobileMql, mobileHandler);
    return () => {
      unbind(hoverMql, hoverHandler);
      unbind(mobileMql, mobileHandler);
    };
  }, []);

  const handleEnter = () => {
    if (!isTouch && hasBack) setFlipped(true);
  };
  const handleLeave = () => {
    if (!isTouch) setFlipped(false);
  };
  const handleClick = () => {
    if (hasBack) setFlipped((f) => !f);
  };

  const rotateAxis = isMobile ? "X" : "Y";
  const mobileHeight = flipped ? 300 : 120;
  const heightClass = isMobile ? "" : "sm:h-[240px] md:h-[260px]";

  return (
    <div
      className={`relative w-full cursor-pointer select-none ${heightClass}`}
      style={{
        perspective: "1400px",
        height: isMobile ? `${mobileHeight}px` : undefined,
        transition: isMobile ? "height 800ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      role={hasBack ? "button" : undefined}
      tabIndex={hasBack ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (hasBack) {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 800ms cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? `rotate${rotateAxis}(180deg)` : `rotate${rotateAxis}(0deg)`,
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-sm"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            backgroundColor: bgColor || "#d5cec6",
          }}
        >
          {image && (
            <img
              src={image}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <h3 className="text-white font-bold leading-tight drop-shadow-md text-xl sm:text-2xl">
              {title}
            </h3>
          </div>
        </div>

        {/* Back face */}
        {hasBack && (
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-md bg-[#43A9AB] p-5 sm:p-6 flex flex-col justify-center"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: `rotate${rotateAxis}(180deg)`,
            }}
          >
            <h3 className="text-white font-bold text-lg sm:text-xl leading-tight mb-3">
              {title}
            </h3>
            <p className="text-white/95 text-sm sm:text-base leading-relaxed">
              {desc}
            </p>
            {href && (
              <Link
                to={href}
                onClick={(e) => e.stopPropagation()}
                className="mt-5 inline-flex items-center gap-2 self-end text-[#43A9AB] bg-white font-bold text-sm sm:text-base tracking-wide rounded-full px-6 py-3 shadow-lg no-underline hover:shadow-xl transition-shadow"
              >
                {t("common.learnMore")}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchwerpunkteGrid({ therapies: therapiesProp, title: titleProp }) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const gridAnim = useScrollFadeIn();

  const therapyHrefs = {
    ketamin:      lang === "en" ? "/en/ketamine"                       : "/ketamin",
    schwermetall: lang === "en" ? "/en/therapies/heavy-metal-detox"    : "/therapien/schwermetall-ausleitung",
    schimmel:     lang === "en" ? "/en/therapies/mold-therapy"         : "/therapien/schimmel-therapie",
    darmreset:    lang === "en" ? "/en/therapies/gut-reset"            : "/therapien/darm-reset",
    hormone:      lang === "en" ? "/en/therapies/hormones"             : "/therapien/hormone",
    burnout:      lang === "en" ? "/en/therapies/burnout-fix"          : "/therapien/burnout-fix",
  };

  const defaultTherapies = [
    {
      title: t("spezielleTherapien.therapies.ketamin.title"),
      desc: t("spezielleTherapien.therapies.ketamin.desc"),
      image: "/Assets/Spezielle%20Therapien2/Ketamin%20Therapie.png",
      href: therapyHrefs.ketamin,
    },
    {
      title: t("spezielleTherapien.therapies.schwermetall.title"),
      desc: t("spezielleTherapien.therapies.schwermetall.desc"),
      image: "/Assets/Spezielle%20Therapien2/Schwermetall%20Ausleitung.png",
      href: therapyHrefs.schwermetall,
    },
    {
      title: t("spezielleTherapien.therapies.schimmel.title"),
      desc: t("spezielleTherapien.therapies.schimmel.desc"),
      image: "/Assets/Spezielle%20Therapien2/Schimmel%20Therapie.png",
      href: therapyHrefs.schimmel,
    },
    {
      title: t("spezielleTherapien.therapies.darmreset.title"),
      desc: t("spezielleTherapien.therapies.darmreset.desc"),
      image: "/Assets/Spezielle%20Therapien2/Darm%20Reset.png",
      href: therapyHrefs.darmreset,
    },
    {
      title: t("spezielleTherapien.therapies.hormone.title"),
      desc: t("spezielleTherapien.therapies.hormone.desc"),
      image: "/Assets/Spezielle%20Therapien2/Hormone.png",
      href: therapyHrefs.hormone,
    },
    {
      title: t("spezielleTherapien.therapies.burnout.title"),
      desc: t("spezielleTherapien.therapies.burnout.desc"),
      image: "/Assets/Spezielle%20Therapien2/Burnout_Fix_.png",
      href: therapyHrefs.burnout,
    },
  ];

  const therapies = therapiesProp || defaultTherapies;
  const title = titleProp === undefined ? t("spezielleTherapien.grid.title") : titleProp;

  return (
    <section ref={gridAnim.ref} style={gridAnim.style} className="px-5 sm:px-10 py-10 sm:py-14">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2
            className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter mb-12 sm:mb-16"
            style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}
          >
            {title}
          </h2>
        )}
        <FlipGridInner therapies={therapies} />
      </div>
    </section>
  );
}

function FlipGridInner({ therapies }) {
  const [activeIndex, setActiveIndex] = useState(null);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
      {therapies.map((therapy, index) => (
        <FlipCard
          key={index}
          {...therapy}
          flipped={activeIndex === index}
          onFlip={() => setActiveIndex(index)}
          onUnflip={() => setActiveIndex((i) => (i === index ? null : i))}
        />
      ))}
    </div>
  );
}
