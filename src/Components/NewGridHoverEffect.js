

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Shukr from "../Assets/Shukr.jpg";

const NewGridHoverEffect = () => {
  const { t, i18n } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const sectionRef = useRef(null);
  const [visibleCards, setVisibleCards] = useState([false, false, false, false]);

  const isEn = i18n.language === "en";

  // Define the data inside the component
  const data2 = [
    {
      title: "grid1",
      label: t("homeGrid.items.beratung.label"),
      subtitle: t("homeGrid.items.beratung.subtitle"),
      image: "/Assets/Beratungen.jpeg",
      route: isEn ? "/en/consultations" : "/beratung",
    },
    {
      title: "grid2",
      label: t("homeGrid.items.diagnostik.label"),
      subtitle: t("homeGrid.items.diagnostik.subtitle"),
      image: "/Assets/Diagnostik.png",
      route: isEn ? "/en/diagnostics" : "/diagnostik",
    },
    {
      title: "grid3",
      label: t("homeGrid.items.infusion.label"),
      subtitle: t("homeGrid.items.infusion.subtitle"),
      image: "/Assets/Infusionen.jpeg",
      route: isEn ? "/en/infusions" : "/infusions",
    },
    {
      title: "grid4",
      label: t("homeGrid.items.mentoring.label"),
      subtitle: t("homeGrid.items.mentoring.subtitle"),
      image: "/Assets/Mentoring.png",
      route: isEn ? "/en/mentoring" : "/mentoring",
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const component = document.getElementById("new-grid-hover");
      const rect = component.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if the component is leaving the viewport
      if (rect.bottom < windowHeight + 10) {
        setBgColor("#ffffff"); // Set light background color
      } else {
        setBgColor("#ffffff"); // Reset to dark background color
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    let timeouts = [];
    const handleCardScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
        data2.forEach((_, i) => {
          const t = setTimeout(() => {
            setVisibleCards(prev => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          }, i * 150);
          timeouts.push(t);
        });
      } else {
        timeouts.forEach(clearTimeout);
        timeouts = [];
        setVisibleCards([false, false, false, false]);
      }
    };
    window.addEventListener("scroll", handleCardScroll, { passive: true });
    handleCardScroll();
    return () => {
      window.removeEventListener("scroll", handleCardScroll);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const rows = [data2];

  return (
    <div
      id="new-grid-hover"
      className="relative flex flex-col gap-4 w-full px-5 sm:px-10 transition-colors"
      style={{
        backgroundColor: bgColor,
        transition: "background-color 1.2s ease",
        paddingBottom: "56px",
        paddingTop: "56px",
      }}
    >
      <div className="w-full max-w-7xl mx-auto">
        <h2 className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter text-left mb-12 sm:mb-16 max-w-[50%]" style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}>
          {t("homeGrid.title")}
        </h2>
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} ref={sectionRef} className="flex gap-1">
          {row.map((item, index) => {
            const globalIndex = index;
            return (
              <div
                key={globalIndex}
                className={`relative overflow-hidden rounded-lg transition-all duration-700 block ${
                  hoveredIndex === globalIndex
                    ? "flex-[1.2] z-10"
                    : hoveredIndex !== null
                    ? "flex-[0.9]"
                    : "flex-1"
                }`}
                style={{
                  height: "400px",
                  marginLeft: "2px",
                  opacity: visibleCards[globalIndex] ? 1 : 0,
                  transform: visibleCards[globalIndex] ? "translateY(0)" : "translateY(60px)",
                  transition: "opacity 0.6s ease-out, transform 0.6s ease-out, flex 0.7s ease",
                }}
                onMouseEnter={() => setHoveredIndex(globalIndex)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <img
                  src={item.image}
                  alt={t(`grid_hover.items.${item.title}`)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                <div className="absolute top-6 left-8 right-4">
                  <h3 className="text-white font-bold uppercase text-3xl">
                    {item.label}
                  </h3>
                </div>
                <div className="absolute left-8 right-4" style={{ top: "200px" }}>
                  <p className="text-white text-base">{item.subtitle}</p>
                  {item.bullets && (
                    <ul className="text-white text-base list-disc list-inside mt-1">
                      {item.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="absolute right-8 bottom-6">
                  <Link
                    to={item.route}
                    className="inline-block bg-white text-[#43A9AB] font-bold text-base px-7 py-3 rounded-full shadow-lg hover:bg-[#43A9AB] hover:text-white transition-colors no-underline"
                  >
                    {t("homeGrid.learnMore")} &rarr;
                  </Link>
                </div>
                {item.location && (
                  <div className="absolute right-4 bottom-6">
                    <p className="text-white text-base font-semibold text-right">{item.location}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default NewGridHoverEffect;
