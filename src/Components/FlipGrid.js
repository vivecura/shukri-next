import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import useIsMobile from "../hooks/useIsMobile";

function CardGrid({ cards, visible, flipped, setFlipped, slideDirections }) {
  return cards.map((card, i) => {
    const dir = slideDirections[i];
    return (
      <div
        key={i}
        className="relative cursor-pointer"
        style={{
          transform: visible
            ? "translate(0, 0)"
            : `translate(${dir.x}, ${dir.y})`,
          opacity: visible ? 1 : 0,
          transition: `transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s, opacity 0.6s ease ${i * 0.1}s`,
          perspective: "1000px",
        }}
        onMouseEnter={() => setFlipped(i)}
        onMouseLeave={() => setFlipped(null)}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped === i ? "rotateX(180deg)" : "rotateX(0deg)",
            transition: "transform 0.6s ease",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-5"
            style={{
              backfaceVisibility: "hidden",
              backgroundImage: `url("${card.image}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 85%)" }}
            />
            <span className="relative text-white/70 text-sm font-mono">{card.number}</span>
            <h3 className="relative text-white text-base md:text-lg font-bold drop-shadow">{card.front}</h3>
          </div>
          <div
            className="absolute inset-0 rounded-2xl flex flex-col justify-center p-5 md:p-6"
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)", backgroundColor: "#43A9AB" }}
          >
            <h3 className="text-white text-base md:text-lg font-bold mb-3 leading-tight">{card.front}</h3>
            <p className="text-white/90 text-xs md:text-sm leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>
    );
  });
}

function FlipGrid({
  title,
  subtitle,
  textLayout = "offset",
  cards,
  showBottomButton = true,
  stackedSubtitleMarginLeft = "12%",
}) {
  const { t } = useTranslation();
  const defaultCardsTranslated = t("flipGrid.cards", { returnObjects: true });
  const defaultCards = [
    {
      number: "1",
      front: defaultCardsTranslated[0].front,
      image: "/Assets/Ärztliches Mentoring/ernaehrung-sport.png",
      back: defaultCardsTranslated[0].back,
    },
    {
      number: "2",
      front: defaultCardsTranslated[1].front,
      image: "/Assets/Ärztliches Mentoring/schlafoptimierung.png",
      back: defaultCardsTranslated[1].back,
    },
    {
      number: "3",
      front: defaultCardsTranslated[2].front,
      image: "/Assets/Ärztliches Mentoring/stressmanagement.png",
      back: defaultCardsTranslated[2].back,
    },
    {
      number: "4",
      front: defaultCardsTranslated[3].front,
      image: "/Assets/Ärztliches Mentoring/supplements-infusionen.png",
      back: defaultCardsTranslated[3].back,
    },
  ];

  const resolvedTitle = title === undefined ? t("flipGrid.title") : title;
  const resolvedSubtitle = subtitle === undefined ? t("flipGrid.subtitle") : subtitle;
  const resolvedCards = cards || defaultCards;
  const ctaLabel = t("flipGrid.cta");

  const [visible, setVisible] = useState(false);
  const [flipped, setFlipped] = useState(null);
  const sectionRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const slideDirections = [
    { x: "-100%", y: "-50%" },
    { x: "100%", y: "-50%" },
    { x: "-100%", y: "50%" },
    { x: "100%", y: "50%" },
  ];

  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        className="relative bg-white min-h-screen flex flex-col overflow-hidden"
        style={{ padding: "2rem 1.5rem" }}
      >
        <h2
          className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter mb-6"
          style={{ fontSize: "clamp(1.8rem, 10vw, 3.5rem)" }}
        >
          {resolvedTitle}
        </h2>

        <p className="text-[#515757] text-base font-semibold leading-snug mb-8 whitespace-pre-line" style={{ maxWidth: "280px" }}>
          {resolvedSubtitle}
        </p>

        <div
          className="grid grid-cols-2 gap-3 flex-1"
          style={{ perspective: "1000px" }}
        >
          <CardGrid
            cards={resolvedCards}
            visible={visible}
            flipped={flipped}
            setFlipped={setFlipped}
            slideDirections={slideDirections}
          />
        </div>

        {showBottomButton && (
          <div className="flex justify-center mt-8">
            <a
              href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 text-base font-semibold bg-[#43A9AB] text-white rounded-full hover:bg-[#378f91] transition-colors"
            >
              {ctaLabel}
            </a>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-white min-h-screen flex flex-row overflow-hidden"
      style={{ padding: "3rem 4rem 8rem" }}
    >
      <div className="flex flex-col justify-between" style={{ width: "45%", paddingRight: "2rem" }}>
        <h2
          className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter"
          style={{
            fontSize: "clamp(2rem, 5.5vw, 5rem)",
            marginLeft: textLayout === "stacked" ? "12%" : "15%",
          }}
        >
          {resolvedTitle}
        </h2>

        <p
          className="text-[#515757] text-lg md:text-xl font-semibold leading-snug whitespace-pre-line"
          style={
            textLayout === "stacked"
              ? { maxWidth: "460px", marginLeft: stackedSubtitleMarginLeft, marginBottom: "5%" }
              : { maxWidth: "320px", marginLeft: "55%", marginBottom: "5%" }
          }
        >
          {resolvedSubtitle}
        </p>
      </div>

      <div
        className="flex flex-col"
        style={{ width: "35%", alignSelf: "stretch", marginLeft: "15%", transform: "translateY(8%)" }}
      >
        <div
          className="grid grid-cols-2 gap-4 flex-1"
          style={{ perspective: "1000px" }}
        >
          <CardGrid
            cards={resolvedCards}
            visible={visible}
            flipped={flipped}
            setFlipped={setFlipped}
            slideDirections={slideDirections}
          />
        </div>

        {showBottomButton && (
          <div className="flex justify-center mt-8">
            <a
              href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 text-base md:text-lg font-semibold bg-[#43A9AB] text-white rounded-full hover:bg-[#378f91] transition-colors"
            >
              {ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default FlipGrid;
