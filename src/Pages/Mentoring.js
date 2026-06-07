import FlipGrid from "../Components/FlipGrid";
import FanCards from "../Components/FanCards";
import FanCardsMobile from "../Components/FanCardsMobile";
import UnifiedBottomCta from "../Components/UnifiedBottomCta";
import ProcessTimeline from "../Components/ProcessTimeline";
import useIsMobile from "../hooks/useIsMobile";
import Seo from "../Components/Seo";
import { useTranslation } from "react-i18next";

function Mentoring() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const focusCardsTranslated = t("mentoring.focusCards", { returnObjects: true });
  const processStepsTranslated = t("mentoring.processSteps", { returnObjects: true });

  const mentoringFocusCards = [
    {
      image: "/Assets/Deine Themen im Fokus2/OnlineMentoring.png",
      label: focusCardsTranslated[0].label,
      title: focusCardsTranslated[0].title,
      desc: focusCardsTranslated[0].desc,
      path: "",
    },
    {
      image: "/Assets/Deine Themen im Fokus2/Biofeedback.png",
      label: focusCardsTranslated[1].label,
      title: focusCardsTranslated[1].title,
      desc: focusCardsTranslated[1].desc,
      path: "",
    },
    {
      image: "/Assets/Deine Themen im Fokus2/Selflove.png",
      label: focusCardsTranslated[2].label,
      title: focusCardsTranslated[2].title,
      desc: focusCardsTranslated[2].desc,
      path: "",
    },
  ];

  return (
    <div className="bg-white min-h-screen pt-20">
      <Seo
        title={t("mentoring.seoTitle")}
        description={t("mentoring.seoDescription")}
      />
      <FlipGrid />
      {isMobile ? (
        <FanCardsMobile cards={mentoringFocusCards} />
      ) : (
        <FanCards cards={mentoringFocusCards} />
      )}
      <ProcessTimeline
        title={t("mentoring.processTitle")}
        subtitle={t("mentoring.processSubtitle")}
        steps={processStepsTranslated}
      />
      <UnifiedBottomCta className="pt-8 sm:pt-12 pb-20 sm:pb-28 px-5 sm:px-8" />
    </div>
  );
}

export default Mentoring;
