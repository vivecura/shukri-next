"use client";

import { usePathname } from "next/navigation";
import { detectLang } from "@/lib/routeMap";

// Reads the language from the URL. Returns 'de' | 'en'.
export default function useLanguage() {
  const pathname = usePathname();
  return detectLang(pathname);
}
