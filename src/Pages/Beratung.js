import FlipGrid from "../Components/FlipGrid";
import UnifiedBottomCta from "../Components/UnifiedBottomCta";
import Seo from "../Components/Seo";
import { useTranslation } from "react-i18next";

function Beratung() {
  const { t } = useTranslation();
  const cardsTranslated = t("beratung.cards", { returnObjects: true });

  const beratungCards = [
    {
      number: "1",
      front: cardsTranslated[0].front,
      image: "/Assets/Images_Beratung/Aktives Zuhören.png",
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
      <Seo
        title={t("beratung.seoTitle")}
        description={t("beratung.seoDescription")}
      />
      <FlipGrid
        title={t("beratung.title")}
        subtitle={t("beratung.subtitle")}
        textLayout="stacked"
        stackedSubtitleMarginLeft="18%"
        showBottomButton={false}
        cards={beratungCards}
      />
      <UnifiedBottomCta className="pt-8 sm:pt-12 pb-20 sm:pb-28 px-5 sm:px-8" />
    </div>
  );
}

export default Beratung;
