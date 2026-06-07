import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Seo from "../Components/Seo";

function Experience() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const videoRefs = useRef([]);
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const translatedChapters = t("experience.chapters", { returnObjects: true });
  const chapters = [
    {
      ...translatedChapters[0],
      video: "/Assets/1.mp4",
      videoMob: "/Assets/1mob.mp4",
    },
    {
      ...translatedChapters[1],
      video: "/Assets/2.mp4",
      videoMob: "/Assets/2mob.mp4",
    },
    {
      ...translatedChapters[2],
      video: "/Assets/3.mp4",
      videoMob: "/Assets/3mob.mp4",
    },
    {
      ...translatedChapters[3],
      video: "/Assets/4.mp4",
      videoMob: "/Assets/4mob.mp4",
    },
  ];

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleScroll = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = sectionHeight - viewportHeight;

    if (scrollableDistance <= 0) return;

    const rawProgress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));
    setProgress(rawProgress);

    // Determine active chapter
    const chapterCount = chapters.length;
    const sliceSize = 1 / chapterCount;
    const chapterIndex = Math.min(
      chapterCount - 1,
      Math.floor(rawProgress * chapterCount)
    );

    if (chapterIndex !== activeChapter) {
      setActiveChapter(chapterIndex);
    }
  }, [activeChapter, chapters.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Play/pause videos based on active chapter
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === activeChapter) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeChapter]);

  const chapterCount = chapters.length;
  const sliceSize = 1 / chapterCount;

  const getChapterStyle = (index) => {
    const chapterStart = index * sliceSize;
    const chapterEnd = (index + 1) * sliceSize;
    const chapterMid = chapterStart + sliceSize * 0.5;

    const startY = 25;
    const endY = -25;

    let opacity = 0;
    let translateY = startY;

    if (progress < chapterStart) {
      opacity = 0;
      translateY = startY;
    } else if (progress >= chapterStart && progress < chapterMid) {
      const t = (progress - chapterStart) / (chapterMid - chapterStart);
      opacity = t;
      translateY = startY * (1 - t);
    } else if (progress >= chapterMid && progress < chapterEnd) {
      if (index === chapterCount - 1) {
        opacity = 1;
        translateY = 0;
      } else {
        const t = (progress - chapterMid) / (chapterEnd - chapterMid);
        opacity = 1 - t;
        translateY = endY * t;
      }
    } else {
      opacity = 0;
      translateY = endY;
    }

    return {
      opacity,
      transform: `translateY(${translateY}vh)`,
    };
  };

  // Clip-path: first 12% of scroll expands from small rounded rect to fullscreen
  const clipExpand = Math.min(1, progress / 0.12);
  const insetVal = (1 - clipExpand) * 18; // 18% inset -> 0%
  const radiusVal = (1 - clipExpand) * 24; // 24px -> 0px
  const clipPath = `inset(${insetVal}% round ${radiusVal}px)`;

  return (
    <div className="bg-white">
      <Seo
        title={t("experience.seoTitle")}
        description={t("experience.seoDescription")}
      />
      {/* Spacer so user scrolls into the section */}
      <div style={{ height: "50vh" }} />

      <section
        ref={sectionRef}
        style={{ height: `${chapterCount * 150 + 50}vh` }}
        className="relative"
      >
        {/* Sticky fullscreen container */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden bg-[#1a1a1a]"
          style={{ clipPath }}
        >

          {/* Video layers — one per chapter, crossfade */}
          {chapters.map((chapter, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: i === activeChapter ? 1 : 0,
                transition: "opacity 0.8s ease",
              }}
            >
              <video
                ref={(el) => (videoRefs.current[i] = el)}
                src={isMobile ? chapter.videoMob : chapter.video}
                muted
                playsInline
                preload="auto"
                loop
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {/* Chapter text cards */}
          {chapters.map((chapter, i) => {
            const style = getChapterStyle(i);
            return (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none"
                style={style}
              >
                <div className="text-center max-w-2xl">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 whitespace-pre-line leading-tight">
                    {chapter.title}
                  </h2>
                  {chapter.subtitle && (
                    <p className="text-white/60 text-sm sm:text-base md:text-lg leading-relaxed max-w-lg mx-auto">
                      {chapter.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Scroll hint — slow glimmer */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            style={{
              opacity: progress < 0.05 ? 1 : 0,
              transition: "opacity 0.6s ease",
            }}
          >
            <style>{`
              @keyframes glimmerDown {
                0%, 100% { opacity: 0; transform: translateY(-4px); }
                50% { opacity: 1; transform: translateY(4px); }
              }
              .scroll-glimmer { animation: glimmerDown 2.5s ease-in-out infinite; }
            `}</style>
            <svg
              className="w-6 h-6 text-white/50 scroll-glimmer"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Experience;
