import { useCallback, useEffect, useRef, useState } from "react";

function ScrollVideoExperience({ chapters, isMobile }) {
  const sectionRef = useRef(null);
  const videoRefs = useRef([]);
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);

  const chapterCount = chapters.length;
  const sliceSize = 1 / chapterCount;

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

    const chapterIndex = Math.min(chapterCount - 1, Math.floor(rawProgress * chapterCount));
    setActiveChapter(chapterIndex);
  }, [chapterCount]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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

  const clipExpand = Math.min(1, progress / 0.12);
  const insetVal = (1 - clipExpand) * 18;
  const radiusVal = (1 - clipExpand) * 24;
  const clipPath = `inset(${insetVal}% round ${radiusVal}px)`;

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

    return { opacity, transform: `translateY(${translateY}vh)` };
  };

  return (
    <>
      <div style={{ height: "4vh" }} />
      <div
        ref={sectionRef}
        style={{ height: `${chapterCount * 150 + 30}vh` }}
        className="relative"
      >
        <div
          className="sticky top-0 h-screen w-full overflow-hidden bg-[#1a1a1a]"
          style={{ clipPath }}
        >
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
                src={isMobile ? chapter.videoMob || chapter.video : chapter.video}
                muted
                playsInline
                preload="auto"
                loop
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          <div className="absolute inset-0 bg-black/40 pointer-events-none" />

          {chapters.map((chapter, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none"
              style={getChapterStyle(i)}
            >
              <div className="text-center max-w-2xl">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                  {chapter.title}
                </h2>
                {chapter.description && (
                  <p className="text-white/70 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                    {chapter.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: `calc(${insetVal}% + 1.5rem)`,
              opacity: 1,
              pointerEvents: "none",
            }}
          >
            <style>{`
              @keyframes glimmerDown {
                0%, 100% { opacity: 0; transform: translateY(-6px); }
                50% { opacity: 1; transform: translateY(6px); }
              }
              .scroll-glimmer { animation: glimmerDown 2.5s ease-in-out infinite; }
            `}</style>
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white/70 scroll-glimmer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

export default ScrollVideoExperience;
