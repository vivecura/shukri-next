import { useEffect, useState } from "react";
import HomeVideo from "../Components/HomeVideo";
import useIsMobile from "../hooks/useIsMobile";
import NewServicesCardsMobile from "../Components/NewServicesCardsMobile";
import NewServicesCardsMobile2 from "../Components/NewServicesCardsMobile2";

import NewGridHoverEffect from '../Components/NewGridHoverEffect.js';
import NewGridHoverEffectMobile from '../Components/NewGridHoverEffectMobile.js';
import ScrolledLines from "../Components/ScrolledLines";
import ScrolledLinesV3 from "../Components/ScrolledLinesV3";

import ScrollCards from "../Components/ScrollCards";
import ScrollCardsMobile from "../Components/ScrollCardsMobile";
import Carousel3D from "../Components/Carousel3D";
import FanCards from "../Components/FanCards";
import FanCardsMobile from "../Components/FanCardsMobile";
import FlipGrid from "../Components/FlipGrid";
import MobileImageSlider from "../Components/MobileImageSlider";
import Testimonials from "../Components/Testimonials";
import MeinAnsatz from "../Components/MeinAnsatz";
import SchwerpunkteGrid from "../Components/SchwerpunkteGrid";
import ScrollingCards from "../Components/ScrollingCards";
import UnifiedBottomCta from "../Components/UnifiedBottomCta";
import Seo from "../Components/Seo";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
function Home() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  console.log("isMobile:", isMobile, "innerWidth:", window.innerWidth, "innerHeight:", window.innerHeight);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (

    <div className="bg-white min-h-screen">
      <Seo
        title={t("home.seoTitle")}
        description={t("home.seoDescription")}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalClinic",
            name: "ViveCura",
            url: "https://vivecura.com",
            logo: "https://vivecura.com/Assets/logo6.png",
            image: "https://vivecura.com/Assets/logo6.png",
            telephone: "+4930200060860",
            email: "praxis@vivecura.com",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Berlin",
              addressCountry: "DE",
            },
            medicalSpecialty: ["InternalMedicine", "Psychiatric"],
            sameAs: [
              "https://www.instagram.com/vivecura/",
              "https://www.linkedin.com/in/shukri-jarmoukli/",
              "https://www.tiktok.com/@shukri.jarmoukli",
              "https://www.youtube.com/@shukrijarmoukli",
            ],
            areaServed: { "@type": "City", name: "Berlin" },
          })}
        </script>
      </Helmet>

     <ScrolledLinesV3 />
     

  
   
      

    <div id="services">
        {isMobile ? <NewGridHoverEffectMobile /> : <NewGridHoverEffect />}
      </div>
  
    {/* Fan Cards */}
    {isMobile ? <FanCardsMobile /> : <FanCards />}

    

    {/* 3D Carousel */}
    {/* <Carousel3D /> */}



{/* Flip Grid — moved to Extras */}

     {/* Scroll Cards */}
     {/* {isMobile ? <ScrollCardsMobile /> : <ScrollCards />} */}

     <MeinAnsatz />

     <SchwerpunkteGrid />

     <ScrollingCards />

     <Testimonials />
     <UnifiedBottomCta />

     {/* MobileImageSlider moved to Extras */}
  




      

      {/* <div id="landing-page">
        <HomeVideo
          videoSrc="/docs4.mp4"
          mobileVideoSrc="/docsmobile.mp4"
          posterImage="/Assets/c.webp"
          windowWidth={windowWidth}
        />
      </div> */}


    </div>
  );
}

export default Home;
