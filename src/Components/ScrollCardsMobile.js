import React, { useState, useRef, useCallback, useEffect } from "react";
import rev2 from "../Assets/rev2.png";

const CYCLE_WIDTH = 2200;
const DUPLICATES = 4;

const ScrollCardsMobile = () => {
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRef = useRef(null);
  const isResettingRef = useRef(false);

  const cardSizes = [
    { width: "140px", height: "90px" },
    { width: "160px", height: "100px" },
    { width: "130px", height: "95px" },
  ];

  const firstRowImages = [rev2, rev2, rev2, rev2, rev2, rev2];
  const secondRowImages = [rev2, rev2, rev2, rev2, rev2, rev2];

  const generateCards = (images, rowId) => {
    return Array.from({ length: 12 }).map((_, index) => {
      const { width, height } = cardSizes[index % cardSizes.length];
      const imageUrl = images[index % images.length];

      return (
        <div
          key={`${rowId}-${index}`}
          className="rounded-lg flex-shrink-0"
          style={{
            width,
            height,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundColor: "#fff",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
          }}
        />
      );
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = CYCLE_WIDTH;
      setScrollLeft(CYCLE_WIDTH);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (isResettingRef.current || !scrollRef.current) return;
    const left = scrollRef.current.scrollLeft;
    setScrollLeft(left);

    if (left >= CYCLE_WIDTH * 2) {
      isResettingRef.current = true;
      scrollRef.current.scrollLeft = left - CYCLE_WIDTH;
      setScrollLeft(left - CYCLE_WIDTH);
      requestAnimationFrame(() => {
        isResettingRef.current = false;
      });
    } else if (left <= 50) {
      isResettingRef.current = true;
      scrollRef.current.scrollLeft = left + CYCLE_WIDTH;
      setScrollLeft(left + CYCLE_WIDTH);
      requestAnimationFrame(() => {
        isResettingRef.current = false;
      });
    }
  }, []);

  return (
    <div
      className="bg-white py-10 relative md:hidden"
      style={{ overflowX: "hidden", overflowY: "visible" }}
    >
      <h2
        className="text-center text-2xl font-bold mb-8 text-[#515757]"
        style={{ filter: "drop-shadow(1px 1px 0.7px #909497)" }}
      >
        Our Visitors Love Us!
      </h2>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-scroll-cards-mobile
        className="overflow-x-auto overflow-y-hidden"
        style={{
          width: "100%",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          [data-scroll-cards-mobile]::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div
          style={{
            width: CYCLE_WIDTH * 3,
            minHeight: "220px",
            position: "relative",
          }}
        >
          {/* Row 1: moves left with scroll, duplicated for infinite */}
          <div
            className="flex gap-4"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            {Array.from({ length: DUPLICATES }).map((_, i) => (
              <React.Fragment key={`r1-${i}`}>
                {generateCards(firstRowImages, `row1-${i}`)}
              </React.Fragment>
            ))}
          </div>

          {/* Row 2: moves right when user scrolls (opposite of row 1), duplicated for infinite both ways */}
          <div
            className="flex gap-4"
            style={{
              position: "absolute",
              right: 0,
              top: "120px",
              justifyContent: "flex-end",
              transform: `translateX(${scrollLeft * 2}px)`,
              transition: "none",
            }}
          >
            {Array.from({ length: DUPLICATES * 3 }).map((_, i) => (
              <React.Fragment key={`r2-${i}`}>
                {generateCards(secondRowImages, `row2-${i}`)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollCardsMobile;
