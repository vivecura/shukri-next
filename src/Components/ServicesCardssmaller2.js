import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const ServicesCardssmaller2 = () => {
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const expandedCardRef = useRef(null);
  const sectionRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Close expanded card on outside click only
  useEffect(() => {
    if (expandedIndex === null) return;
    const handleClose = (e) => {
      if (
        expandedCardRef.current &&
        !expandedCardRef.current.contains(e.target)
      ) {
        setExpandedIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
    };
  }, [expandedIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (expandedIndex !== null) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [expandedIndex]);

  // Scroll-based animation logic — relative to the component's position
  useEffect(() => {
    if (expandedIndex !== null) return;
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // Animation starts when section is still well below the viewport,
      // completes when section top reaches upper third
      const isMobileView = window.innerWidth < 768;
      const start = windowHeight * 0.7;
      const end = windowHeight * 0.5;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [expandedIndex]);

  const cardLayout = [
    { key: "iron",             img: "/Assets/infusions-pics/Eisen.png",                 targetX: -60, targetY: 120, rotate: -8 },
    { key: "antiPain",         img: "/Assets/infusions-pics/Anti Schmerz.png",          targetX: -30, targetY: 100, rotate: 10 },
    { key: "antiInflammation", img: "/Assets/infusions-pics/Anti Entzundung.png",       targetX:  70, targetY: 130, rotate: -6 },
    { key: "detox",            img: "/Assets/infusions-pics/Detox.png",                 targetX:  40, targetY: 150, rotate:  5 },
    { key: "regeneration",     img: "/Assets/infusions-pics/Regeneration.png",          targetX:  55, targetY: 110, rotate: -9 },
    { key: "veganBoost",       img: "/Assets/infusions-pics/Vegan boost.png",           targetX:  45, targetY: 130, rotate: -10 },
    { key: "nadPlus",          img: "/Assets/infusions-pics/NAD+.png",                  targetX: -45, targetY: 125, rotate:  8 },
    { key: "immuneBoost",      img: "/Assets/infusions-pics/Anti Grippe.png",           targetX: -50, targetY: 140, rotate:  7 },
    { key: "burnoutFix",       img: "/Assets/infusions-pics/Burnout%20Fix.png",         targetX:  65, targetY: 135, rotate: -7 },
    { key: "burnoutFixPlus",   img: "/Assets/infusions-pics/Burnout%20Fix%2B.png",      targetX: -35, targetY: 115, rotate:  6 },
    { key: "antiStress",       img: "/Assets/infusions-pics/Anti Stress.png",           targetX:  50, targetY: 145, rotate: -5 },
    { key: "custom",           img: "/Assets/infusions-pics/Individuelle Mischung.png", targetX: -50, targetY: 110, rotate:  7 },
    { key: "antiFlu",          img: "/Assets/infusions-pics/Anti Grippe.png",           targetX: -55, targetY: 105, rotate:  9 },
    { key: "fatBurner",        img: "/Assets/infusions-pics/Fat Burner.png",            targetX: -40, targetY: 120, rotate:  6 },
    { key: "energyKick",       img: "/Assets/infusions-pics/Energy Kick.png",           targetX:  60, targetY: 140, rotate: -8 },
  ];

  const cards = cardLayout.map((c) => ({
    ...c,
    bg: "bg-white",
    title:       t(`infusions.cards.${c.key}.title`),
    duration:    t(`infusions.cards.${c.key}.duration`),
    price:       t(`infusions.cards.${c.key}.price`),
    popupDesc:   t(`infusions.cards.${c.key}.popupDesc`),
    tags:        t(`infusions.cards.${c.key}.tags`, { returnObjects: true }),
    ingredients: t(`infusions.cards.${c.key}.ingredients`),
    whyTitle:    t(`infusions.cards.${c.key}.whyTitle`),
    whyText:     t(`infusions.cards.${c.key}.whyText`),
  }));

  return (
    <div ref={sectionRef} className="relative flex flex-col justify-center items-center bg-white max-w-screen min-h-[60vh] pt-0 pb-16" style={{ overflowX: 'clip', overflowY: 'visible' }}>
      {/* Blurred overlay when expanded */}
      {expandedIndex !== null && (
        <div className="fixed inset-0 bg-black/80 z-[150] transition-opacity duration-200 ease-out will-change-opacity" />
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-6xl px-4 relative z-50">
        {cards.map((card, index) => {
          // Expanded card logic
          if (expandedIndex === index) {
            return null; // Hide the original card in the grid when expanded
          }
          // Normal card with scroll-based animation
          // Calculate animation transform
          const gridCol = index % 4;
          const gridRow = Math.floor(index / 4);
          // Final position: no transform
          // Initial: stacked in center, with offset and rotation
          const translateX = (1 - scrollProgress) * card.targetX;
          const translateY = (1 - scrollProgress) * card.targetY;
          const rotate = (1 - scrollProgress) * card.rotate;
          return (
            <div
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setExpandedIndex(index)}
              className={`w-full h-[280px] rounded-2xl shadow-lg flex flex-col cursor-pointer transition-transform duration-500 relative ${card.bg}`}
              style={{
                zIndex: hoveredIndex === index ? 70 : 10,
                transform:
                  `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)` +
                  (hoveredIndex === index ? " scale(1.07)" : " scale(1)"),
                filter: expandedIndex !== null ? "blur(2px)" : "none",
                pointerEvents: expandedIndex !== null ? "none" : "auto",
              }}
            >
              <div
                className={`absolute inset-0 ${card.bg} rounded-3xl transition-transform duration-500`}
                style={{
                  transform: hoveredIndex === index ? "scale(1.03)" : "scale(1)",
                  transitionTimingFunction: "cubic-bezier(0.3, 2.5, 0.6, 1.8)",
                  transitionDuration: "500ms",
                }}
              />
              <div className="relative z-10 flex flex-col w-full h-full">
                <div className="w-full h-40 overflow-hidden rounded-t-2xl">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
                  <h2 className="font-semibold text-base md:text-lg text-[#515757] text-left">{card.title}</h2>
                  <div className="flex items-center gap-1.5 mt-1 text-[#515757]/50 text-xs md:text-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{card.duration}</span>
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-lg font-bold text-[#515757]">{card.price}</span>
                    <button className="w-10 h-10 rounded-full bg-[#43a9ab] flex items-center justify-center hover:bg-[#389193] transition-colors">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Expanded card overlay */}
      {expandedIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out" />
          <div
            ref={expandedCardRef}
            className="relative bg-white rounded-3xl popup-animate flex flex-col overflow-hidden"
            style={{
              width: "min(500px, 92vw)",
              maxHeight: "90vh",
              boxShadow: "0 8px 40px 0 rgba(0,0,0,0.18)",
            }}
          >
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedIndex(null);
              }}
              className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md hover:scale-110 transition-transform"
            >
              <svg className="w-4 h-4 text-[#515757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Image */}
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={cards[expandedIndex].img}
                  alt={cards[expandedIndex].title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Description + Tags */}
              <div className="px-6 pt-5 pb-4">
                <h2 className="font-bold text-xl text-[#515757]">{cards[expandedIndex].title}</h2>
                <p className="mt-3 text-sm text-[#515757]/70 leading-relaxed">{cards[expandedIndex].popupDesc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {cards[expandedIndex].tags.map((tag, i) => (
                    <span key={i} className="text-xs font-medium text-[#43a9ab] bg-[#43a9ab]/10 px-3 py-1.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-[#515757]/10 mt-6 mb-5" />

                {/* Ingredients */}
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-[#515757] mb-1">{t("infusions.ingredients")}</h3>
                  <p className="text-sm text-[#515757]/60 leading-relaxed">{cards[expandedIndex].ingredients}</p>
                </div>

                {/* Why section */}
                {cards[expandedIndex].whyTitle && (
                  <div>
                    <h3 className="text-sm font-bold text-[#515757] mb-2">{cards[expandedIndex].whyTitle}</h3>
                    <p className="text-sm text-[#515757]/60 leading-relaxed">{cards[expandedIndex].whyText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="px-6 py-4 border-t border-[#515757]/10 flex items-center gap-3">
              <span className="text-xl font-bold text-[#515757]">{cards[expandedIndex].price}</span>
              <div className="flex-1 flex items-center gap-2 justify-end">
                <a
                  href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#43a9ab] text-sm font-medium text-white hover:bg-[#389193] transition-colors no-underline"
                >{t("infusions.bookNow")}</a>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes popupFadeIn {
              0% { opacity: 0; transform: scale3d(0.85, 0.85, 1); }
              100% { opacity: 1; transform: scale3d(1, 1, 1); }
            }
            .popup-animate {
              animation: popupFadeIn 0.25s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ServicesCardssmaller2;
