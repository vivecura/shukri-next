"use client";

import { useState, useEffect } from "react";

// Fades an element in (and slides it up) the first time it scrolls into view.
// Usage: const anim = useScrollFadeIn(); <section {...anim}>  (spreads ref + style)
export default function useScrollFadeIn({
  threshold = 0.1,
  distance = 40,
  duration = 1.2,
  delay = 0,
} = {}) {
  // Callback ref: the element lands in state once it mounts.
  const [el, setEl] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, threshold]);

  return {
    ref: setEl,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : `translateY(${distance}px)`,
      transition: `opacity ${duration}s ease-out ${delay}s, transform ${duration}s ease-out ${delay}s`,
    },
  };
}
