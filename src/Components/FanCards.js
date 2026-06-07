import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function FanCards({ cards: cardsProp, title: titleProp }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const defaultCardData = [
    {
      image: "/Assets/KoerperlicheBeschwerden.png",
      label: t("fanCards.items.koerperlich.label"),
      title: t("fanCards.items.koerperlich.title"),
      desc: t("fanCards.items.koerperlich.desc"),
      path: isEn ? "/en/physical-symptoms" : "/koerperliche-symptome",
    },
    {
      image: "/Assets/PraeventionLongevity.png",
      label: t("fanCards.items.praevention.label"),
      title: t("fanCards.items.praevention.title"),
      desc: t("fanCards.items.praevention.desc"),
      path: isEn ? "/en/prevention-longevity" : "/praevention-longevity",
    },
    {
      image: "/Assets/Psychotherapie.png",
      label: t("fanCards.items.psychisch.label"),
      title: t("fanCards.items.psychisch.title"),
      desc: t("fanCards.items.psychisch.desc"),
      path: isEn ? "/en/psychotherapy" : "/psychotherapie",
    },
  ];

  const cardData = cardsProp || defaultCardData;
  const title = titleProp === undefined ? t("fanCards.title") : titleProp;

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setOpen(entry.isIntersecting),
      { threshold: 0.4 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const cardW = isMobile ? 220 : 280;
  const cardH = isMobile ? 300 : 380;

  const positions = [
    { x: -(cardW * 1), rotate: 0, z: 0, scale: 0.88 },
    { x: 0, rotate: 0, z: 10, scale: 1 },
    { x: cardW * 1, rotate: 0, z: 0, scale: 0.88 },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative bg-white flex flex-col items-center justify-center overflow-x-hidden px-5 sm:px-10 py-10 sm:py-14"
    >
      {title && (
        <div className="w-full max-w-7xl mx-auto">
          <h2 className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter text-left mb-12 sm:mb-16 max-w-[50%]" style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}>
            {title}
          </h2>
        </div>
      )}

      <div
        className="relative"
        style={{
          width: isMobile ? "320px" : "580px",
          height: `${cardH + 40}px`,
        }}
      >
        {cardData.map((card, i) => {
          const pos = positions[i];
          return (
            <div
              key={i}
              className={`absolute rounded-2xl overflow-hidden shadow-2xl ${card.path ? "cursor-pointer" : ""}`}
              onClick={() => { if (card.path) navigate(card.path); }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                left: "50%",
                top: "50%",
                marginLeft: `${-cardW / 2}px`,
                marginTop: `${-cardH / 2}px`,
                transform: open
                  ? `translateX(${pos.x}px) rotate(${pos.rotate}deg) scale(${hovered === i ? 1.08 : pos.scale})`
                  : "translateX(0px) rotate(0deg) scale(1)",
                zIndex: hovered === i ? 20 : pos.z,
                transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s",
              }}
            >
              <img
                src={card.image}
                alt={card.label}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-sm opacity-90">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FanCards;
