"use client";

import FlipGrid from "@/components/FlipGrid";
import { useT } from "@/hooks/useT";

function Beratung() {
  const t = useT();
  const cardsTranslated = t("beratung.cards");

  const beratungCards = [
    {
      number: "1",
      front: cardsTranslated[0].front,
      image: "/Assets/Images_Beratung/aktives-zuhoeren.png",
      back: cardsTranslated[0].back,
    },
    {
      number: "2",
      front: cardsTranslated[1].front,
      image: "/Assets/Images_Beratung/Mehrblick statt Tunnelblick.png",
      back: cardsTranslated[1].back,
    },
    {
      number: "3",
      front: cardsTranslated[2].front,
      image: "/Assets/Images_Beratung/Diagnostik.png",
      back: cardsTranslated[2].back,
    },
    {
      number: "4",
      front: cardsTranslated[3].front,
      image: "/Assets/Images_Beratung/Roadmap.png",
      back: cardsTranslated[3].back,
    },
  ];

  return (
    <div className="bg-white min-h-screen pt-20">
      <FlipGrid
        title={t("beratung.title")}
        subtitle={t("beratung.subtitle")}
        textLayout="stacked"
        stackedSubtitleMarginLeft="18%"
        cards={beratungCards}
      />
    </div>
  );
}

export default Beratung;
