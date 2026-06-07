import { useState, useEffect, useRef, useCallback } from "react";

const SLIDE_INTERVAL = 3500;
const SWIPE_THRESHOLD = 50;

const slides = [
  { image: "/Assets/Shukr.jpg", title: "GROW", subtitle: "fuck your lifestyle" },
  { image: "/Assets/c.webp", title: "CHANGE", subtitle: "improve your lifestyle" },
  { image: "/Assets/Shukr.jpg", title: "CRY", subtitle: "fuck your lifestyle" },
  { image: "/Assets/c.webp", title: "DIE", subtitle: "change your lifestyle" },
];

function MobileImageSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const touchStartX = useRef(0);
  const intervalRef = useRef(null);

  const goToSlide = useCallback((index) => {
    setActiveIndex(index);
    setEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        setEpoch((e) => e + 1);
        return next;
      });
    }, SLIDE_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const resetAutoAdvance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        setEpoch((e) => e + 1);
        return next;
      });
    }, SLIDE_INTERVAL);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) {
      goToSlide((activeIndex + 1) % slides.length);
    } else {
      goToSlide((activeIndex - 1 + slides.length) % slides.length);
    }
    resetAutoAdvance();
  };

  return (
    <section
      className="relative w-full h-[100dvh] min-h-screen overflow-hidden md:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.10); }
        }
        .slide-zoom {
          animation: slowZoom 3.5s ease-out forwards;
        }
      `}</style>
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(${(i - activeIndex) * 100}%)`,
            zIndex: i === activeIndex ? 2 : 1,
          }}
        >
          <div
            key={i === activeIndex ? `zoom-${i}-${epoch}` : `zoom-${i}`}
            className={`absolute inset-0 bg-cover bg-center ${i === activeIndex ? "slide-zoom" : ""}`}
            style={{
              backgroundImage: `url(${slide.image})`,
            }}
          />
          <div className="absolute inset-0 bg-black/50" />
          {i === activeIndex && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 pt-[25%]">
              <h2 className="text-white text-4xl font-bold tracking-wide mb-2">
                {slide.title}
              </h2>
              <p className="text-white text-lg mb-6">{slide.subtitle}</p>
              <button className="border border-white text-white px-8 py-3 text-sm tracking-widest hover:bg-white/10 transition-colors">
                LEARN MORE
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Pagination dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              goToSlide(i);
              resetAutoAdvance();
            }}
            className="w-2.5 h-2.5 rounded-full transition-colors"
            style={{
              backgroundColor: i === activeIndex ? "white" : "transparent",
              border: "1.5px solid white",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default MobileImageSlider;
