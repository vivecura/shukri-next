"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { detectLang } from "@/lib/routeMap";

// Sets <html lang> based on the URL on every navigation. Replaces the
// CRA HtmlLang.js + react-helmet-async tandem. Server-rendered lang
// defaults to "de" in the root layout; this hook corrects to "en" on
// EN routes after hydration.
export default function HtmlLang() {
  const pathname = usePathname();
  const lang = detectLang(pathname);

  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return null;
}
