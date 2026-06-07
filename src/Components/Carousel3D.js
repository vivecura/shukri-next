import { useState, useEffect, useRef } from "react";
import Shukr from "../Assets/Shukr.jpg";
import insta from "../Assets/insta.webp";
import fb from "../Assets/fb.png";
import tiktok from "../Assets/tiktok.png";
import ln from "../Assets/ln.png";

const uniqueCards = [
  { image: ln, label: "Review 1" },
  { image: insta, label: "Review 2" },
  { image: fb, label: "Review 3" },
  { image: tiktok, label: "Review 4" },
];

const cards = [...uniqueCards, ...uniqueCards];

function Carousel3D() {
  const [angle, setAngle] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchLastAngle = useRef(0);
  const count = cards.length;
  const sliceAngle = 360 / count;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setAngle((a) => a - 0.25), 16);
    return () => clearInterval(id);
  }, [paused]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const radius = isMobile ? 340 : 380;
  const cardWidth = isMobile ? "140px" : "190px";
  const cardHeight = isMobile ? "160px" : "210px";

  const handleTouchStart = (e) => {
    setPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchLastAngle.current = angle;
  };

  const handleTouchMove = (e) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    setAngle(touchLastAngle.current + diff * 0.5);
  };

  const handleTouchEnd = () => {
    setPaused(false);
  };

  return (
    <section className="relative bg-white min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <h2 className="text-[#43A9AB] text-3xl md:text-4xl font-bold text-center mb-16">
        Social media
      </h2>

      <div
        className="mx-auto"
        style={{
          perspective: "1200px",
          height: isMobile ? "420px" : "400px",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${angle}deg)`,
            transition: paused ? "transform 0.3s ease" : "none",
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {cards.map((card, i) => {
            const rot = sliceAngle * i;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-xl overflow-hidden"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  marginLeft: `calc(-${cardWidth} / 2)`,
                  marginTop: `calc(-${cardHeight} / 2)`,
                  transform: `rotateY(${rot}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <img
                  src={card.image}
                  alt={card.label}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Carousel3D;
