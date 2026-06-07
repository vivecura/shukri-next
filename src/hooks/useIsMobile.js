import { useState, useEffect } from "react";

export default function useIsMobile(breakpoint = { width: 555, height: 500 }) {
  const query = `(max-width: ${breakpoint.width}px), (max-height: ${breakpoint.height}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return isMobile;
}
