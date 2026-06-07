"use client";

import { useEffect, useState } from "react";
import useIsMobile from "@/hooks/useIsMobile";
import NewGridHoverEffect from "@/components/NewGridHoverEffect";
import NewGridHoverEffectMobile from "@/components/NewGridHoverEffectMobile";
import ScrolledLinesV3 from "@/components/ScrolledLinesV3";
import FanCards from "@/components/FanCards";
import FanCardsMobile from "@/components/FanCardsMobile";
import Testimonials from "@/components/Testimonials";
import MeinAnsatz from "@/components/MeinAnsatz";
import SchwerpunkteGrid from "@/components/SchwerpunkteGrid";
import ScrollingCards from "@/components/ScrollingCards";
import UnifiedBottomCta from "@/components/UnifiedBottomCta";

const MEDICAL_CLINIC_JSON_LD = JSON.stringify({
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
});

function Home() {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: MEDICAL_CLINIC_JSON_LD }}
      />

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
