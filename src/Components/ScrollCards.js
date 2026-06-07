

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import rev2 from "../Assets/rev2.png";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

const ScrollCards = () => {
  const rowRef = useRef();
  const reverseRowRef = useRef();
  const titleRef = useRef(); // Reference for the title

  useEffect(() => {
    // Smooth horizontal scrolling for the first row (left movement)
    gsap.to(rowRef.current, {
      x: "-50%", // Scroll left smoothly
      ease: "linear", // Consistent speed
      scrollTrigger: {
        trigger: rowRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true, // Tied to scroll position
      },
    });

    // Smooth horizontal scrolling for the reverse row (right movement)
    gsap.to(reverseRowRef.current, {
      x: "50%", // Scroll right smoothly
      ease: "linear", // Consistent speed
      scrollTrigger: {
        trigger: reverseRowRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true, // Tied to scroll position
      },
    });

    // Scale animation for the title
    gsap.fromTo(
      titleRef.current,
      { scale: 1 }, // Initial scale
      {
        scale: 1.3, // Scaled-up size
        duration: 2,
        scrollTrigger: {
          trigger: titleRef.current,
          start: "top 80%",
          end: "top 40%",
          scrub: true, // Tied to scroll position
        },
      }
    );
  }, []);

  const cardSizes = [
    { width: "340px", height: "139px" }, // Small
    { width: "380px", height: "149px" }, // Medium
    { width: "320px", height: "159px" }, // Large
  ];

  const firstRowImages = [
    rev2,
    rev2,
    rev2,
    rev2,
    rev2,
    rev2,
  ];

  const secondRowImages = [
    rev2,
    rev2,
    rev2,
    rev2,
    rev2,
    rev2,
  ];

  const generateCards = (images, rowId) => {
    return Array.from({ length: 18 }).map((_, index) => {
      const { width, height } = cardSizes[index % cardSizes.length];
      const imageUrl = images[index % images.length]; // Cycle through images

      return (
        <div
          key={`${rowId}-${index}`}
          className="rounded-lg shadow-lg flex items-center justify-center text-lg font-semibold"
          style={{
            width,
            height,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundColor: "#fff",
            boxShadow: "0px 8px 15px rgba(0, 0, 0, 0.2)",
            flexShrink: 0,
            zIndex: 1, // Ensure the cards stay on top
            transform: "translateY(-2px)", // Slightly elevate the cards
          }}
        ></div>
      );
    });
  };

  return (
    <div
      className="bg-white py-16 relative mb-28"
      style={{
        paddingBottom: "20px", // Prevent clipping
        overflowX: "hidden", // Prevent horizontal scrolling
        zIndex: 0, // Ensure it's beneath the logos of the next component
      }}
    >
      {/* Title with scaling effect */}
      <h2
        ref={titleRef}
        className="text-center text-3xl font-bold mb-24 text-[#515757]"
        style={{ filter: "drop-shadow(1px 1px 0.7px #909497)", // Adjusted shadow offset
        }}
      >
        Our Visitors Love Us!
      </h2>

      {/* First Row */}
      <div
        style={{
          overflow: "visible", // Ensure shadows are not clipped
          marginBottom: "40px", // Add space for shadows
        }}
      >
        <div
          ref={rowRef}
          className="flex gap-6"
          style={{
            width: "250%", // Increased width to cover left movement
            display: "flex",
          }}
        >
          {generateCards(firstRowImages, "row1")}
        </div>
      </div>

      {/* Reverse Row */}
      <div
        style={{
          overflow: "visible", // Ensure shadows are not clipped
        }}
      >
        <div
          ref={reverseRowRef}
          className="flex gap-6"
          style={{
            width: "250%", // Increased width to cover right movement
            display: "flex",
            justifyContent: "flex-end", // Start from the right
          }}
        >
          {generateCards(secondRowImages, "row2")}
        </div>
      </div>
    </div>
  );
};

export default ScrollCards;
