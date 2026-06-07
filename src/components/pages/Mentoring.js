"use client";

import FlipGrid from "@/components/FlipGrid";
import FanCards from "@/components/FanCards";
import FanCardsMobile from "@/components/FanCardsMobile";
import UnifiedBottomCta from "@/components/UnifiedBottomCta";
import ProcessTimeline from "@/components/ProcessTimeline";
import useIsMobile from "@/hooks/useIsMobile";
import useLanguage from "@/hooks/useLanguage";
import { useT } from "@/hooks/useT";
import de from "@/locales/de.json";
import en from "@/locales/en.json";

const DICTS = { de, en };

function Mentoring() {
  const t = useT();
  const lang = useLanguage();
  const isMobile = useIsMobile();

  const dict = DICTS[lang] || DICTS.de;
  const focusCardsTranslated = dict?.mentoring?.focusCards || DICTS.de.mentoring.focusCards;
  const processStepsTranslated = dict?.mentoring?.processSteps || DICTS.de.mentoring.processSteps;

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
