import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Shukr from "../Assets/Shukr.jpg";

const NewGridHoverEffectMobile = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [visible, setVisible] = useState([false, false, false, false]);
  const containerRef = useRef(null);

  const data = [
    {
      label: t("homeGrid.items.beratung.label"),
      subtitle: t("homeGrid.items.beratung.subtitle"),
      image: "/Assets/Beratungen.jpeg",
      route: isEn ? "/en/consultations" : "/beratung",
    },
    {
      label: t("homeGrid.items.diagnostik.label"),
      subtitle: t("homeGrid.items.diagnostik.subtitle"),
      image: "/Assets/Diagnostik.png",
      route: isEn ? "/en/diagnostics" : "/diagnostik",
    },
    {
      label: t("homeGrid.items.infusion.label"),
      subtitle: t("homeGrid.items.infusion.subtitle"),
      image: "/Assets/Infusionen.jpeg",
      route: isEn ? "/en/infusions" : "/infusions",
    },
    {
      label: t("homeGrid.items.mentoring.label"),
      subtitle: t("homeGrid.items.mentoring.subtitle"),
      image: "/Assets/Mentoring.png",
      route: isEn ? "/en/mentoring" : "/mentoring",
    },
  ];

  useEffect(() => {
    const timers = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          data.forEach((_, i) => {
            timers.push(
              setTimeout(() => {
                setVisible((prev) => {
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }, i * 150)
            );
          });
        } else {
          timers.forEach(clearTimeout);
          timers.length = 0;
          setVisible([false, false, false, false]);
        }
      },
      { threshold: 0.15 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 w-full px-4 py-10 sm:py-14 overflow-hidden"
      style={{ backgroundColor: "#ffffff" }}
    >
      <h2 className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter text-left mb-10 max-w-[50%] ml-4" style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}>
        {t("homeGrid.title")}
      </h2>
      {data.map((item, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl cursor-pointer"
            style={{
              height: isExpanded ? "280px" : "120px",
              transform: visible[index] ? "translateY(0)" : "translateY(100px)",
              opacity: visible[index] ? 1 : 0,
              transition: "transform 0.6s ease-out, opacity 0.5s ease-out, height 0.5s ease-in-out",
              willChange: "transform, opacity",
            }}
            onClick={() => setExpandedIndex(isExpanded ? null : index)}
          >
            <img
              src={item.image}
              alt={item.label}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            {isExpanded ? (
              <>
                <div className="absolute top-5 left-6 right-4">
                  <h3 className="text-white font-bold uppercase text-2xl">
                    {item.label}
                  </h3>
                </div>
                <div className="absolute left-6 right-4" style={{ top: "160px" }}>
                  <p className="text-white text-sm">{item.subtitle}</p>
                  {item.bullets && (
                    <ul className="text-white text-sm list-disc list-inside mt-1">
                      {item.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="absolute right-6 bottom-4">
                  <Link
                    to={item.route}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block bg-white text-[#43A9AB] font-bold text-sm px-5 py-2.5 rounded-full shadow-lg no-underline"
                  >
                    {t("homeGrid.learnMore")} &rarr;
                  </Link>
                </div>
                {item.location && (
                  <div className="absolute right-4 bottom-4">
                    <p className="text-white text-sm font-semibold text-right">{item.location}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center px-6">
                <h3 className="text-white font-bold uppercase text-xl">
                  {item.label}
                </h3>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NewGridHoverEffectMobile;
