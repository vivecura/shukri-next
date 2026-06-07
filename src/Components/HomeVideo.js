

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from "react-i18next"; // Import translation hook

const HomeVideo = ({ videoSrc = "/docs.mp4", mobileVideoSrc = "/vertical-intro.mp4", posterImage = "/Assets/logo2.png", windowWidth }) => {
  const { t, i18n } = useTranslation(); // Get translation function
  const initialIsMobile = typeof windowWidth === "number" ? windowWidth <= 1288 : false;
  const [currentVideoSrc, setCurrentVideoSrc] = useState(initialIsMobile ? mobileVideoSrc : videoSrc);
  const [videoPadding, setVideoPadding] = useState("0px"); // Padding for shrinking effect
  const [isMobile, setIsMobile] = useState(initialIsMobile); // Track if it's a mobile screen
  const [videoError, setVideoError] = useState(false); // Track video loading errors
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();
    v.addEventListener("loadedmetadata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    return () => {
      v.removeEventListener("loadedmetadata", tryPlay);
      v.removeEventListener("canplay", tryPlay);
    };
  }, [currentVideoSrc]);

  // Force re-render when language changes
  useEffect(() => {
    // This effect will trigger when i18n.language changes
  }, [i18n.language]);

  useEffect(() => {
    const handleResize = () => {
      const isMobileDevice = windowWidth <= 1288;

      setCurrentVideoSrc(isMobileDevice ? mobileVideoSrc : videoSrc);
      setIsMobile(isMobileDevice);
    };

    const handleScroll = () => {
      if (isMobile) return; // No shrinking for mobile screens

      const component = document.getElementById("full-screen-video");
      if (!component) return;

      const rect = component.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Shrink when scrolling down, reset when scrolling up
      if (rect.bottom < windowHeight+100) {
        setVideoPadding("85px"); // Shrink effect
      } else {
        setVideoPadding("0px"); // Expand back to full width when scrolling up
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [videoSrc, mobileVideoSrc, isMobile, windowWidth]);

  return (
    <div
      id="full-screen-video"
      key={i18n.language} // Force re-render when language changes
      className="relative w-full overflow-hidden transition-colors"
      style={{
        backgroundColor: "#ffffff",
        transition: "background-color 1.5s ease",
        paddingBottom: "190px", // Adds space at the bottom
      }}
    >
      {/* Video Section */}
      <div className="relative w-full h-screen">
        {videoError ? (
          // Fallback background image when video fails to load
          <div 
            className="w-full h-full object-cover bg-cover bg-center"
            style={{
              backgroundImage: `url(${posterImage})`,
              borderTopLeftRadius: "0px",
              borderTopRightRadius: "0px",
              borderBottomLeftRadius: "20px",
              borderBottomRightRadius: "20px",
              width: isMobile ? "100%" : `calc(100% - ${videoPadding})`,
              margin: "0 auto",
              transition: "width 0.5s ease-in-out",
            }}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={currentVideoSrc}
            poster={posterImage}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoError(true)}
            onLoadStart={() => setVideoError(false)}
            style={{
              borderTopLeftRadius: "0px",
              borderTopRightRadius: "0px",
              borderBottomLeftRadius: "20px",
              borderBottomRightRadius: "20px",
              width: isMobile ? "100%" : `calc(100% - ${videoPadding})`,
              margin: "0 auto",
              transition: "width 0.5s ease-in-out",
            }}
          >
            {t('home_video.video_unsupported')}
          </video>
        )}

       
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#272626] bg-opacity-0"></div>

        {/* Text Content */}
        <div className="absolute inset-0 flex items-center justify-start px-6 md:px-20 mt-12">
          <div className="text-white max-w-2xl">
            <div>
              <h1
                style={{
                  fontWeight: 'bold',
                  lineHeight: '1.2',
                  marginBottom: '16px',
                  marginLeft: '6px',
                }}
                className="responsive-heading"
              >{t("ideo")}</h1>
              <p
                style={{
                  fontWeight: 'bold',
                  lineHeight: '1.2',
                  marginLeft: '6px',
                }}
                className="responsive-subtitle text-white"
              >{t("subtitle")}</p>
              <p
                style={{
                  fontWeight: 'normal',
                  lineHeight: '1.2',
                  marginLeft: '6px',
                  marginTop: '8px',
                  opacity: '0.9'
                }}
                className="text-white text-lg responsive-tagline"
              >{t("tagline")}</p>
            </div>
            <div className="mt-10">
            <a href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile" target="_blank" rel="noopener noreferrer">
  <button className="px-6 py-2 text-xl font-semibold border border-white rounded-3xl hover:bg-white hover:text-[#422f40] transition-all">
    {t("button")}
  </button>
</a>

            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .responsive-heading {
            font-size: 60px;
          }
          .responsive-subtitle {
            font-size: 32px;
          }
          .responsive-tagline {
            font-size: 18px;
          }
          @media (max-width: 640px) {
            .responsive-heading {
              font-size: 70px;
              max-width: 98%;
              margin-left: 0%;
              margin-right: 0%;
              line-height: 1.1;
            }
            .responsive-subtitle {
              font-size: 36px;
              max-width: 98%;
              margin-left: 0%;
              margin-right: 0%;
              line-height: 1.1;
            }
            .responsive-tagline {
              font-size: 20px;
              max-width: 98%;
              margin-left: 0%;
              margin-right: 0%;
              line-height: 1.1;
            }
          }
          @media (min-width: 768px) {
            .responsive-heading {
              font-size: 55px;
              line-height: 1.1;
              margin-top: 20%;
            }
            .responsive-subtitle {
              font-size: 28px;
              line-height: 1.1;
            }
            .responsive-tagline {
              font-size: 16px;
              line-height: 1.1;
            }
          }
          @media (min-width: 1024px) {
            .responsive-heading {
              font-size: 76px;
              line-height: 1.1;
            }
            .responsive-subtitle {
              font-size: 42px;
              line-height: 1.1;
            }
            .responsive-tagline {
              font-size: 22px;
              line-height: 1.1;
            }
          }
          @media (max-width: 401px) {
            .responsive-heading {
              margin-top: 20%;
              line-height: 1.1;
              font-size: 50px;
            }
            .responsive-subtitle {
              font-size: 26px;
              line-height: 1.1;
            }
            .responsive-tagline {
              font-size: 18px;
              line-height: 1.1;
            }
          }
          @media (min-width: 665px) and (max-height: 500px) {
            .responsive-heading {
              font-size: 29px;
              line-height: 1.1;
              margin-top: 40%;
              max-width: 98%;
            }
            .responsive-subtitle {
              font-size: 18px;
              line-height: 1.1;
              max-width: 98%;
            }
            .responsive-tagline {
              font-size: 14px;
              line-height: 1.1;
              max-width: 98%;
            }
            .landscape-button {
              margin-top: 12px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HomeVideo;
