"use client";

import { usePathname } from "next/navigation";
import { detectLang } from "@/lib/routeMap";
import { tForLang } from "@/lib/i18n";

// Client-side translation hook. Returns a t(key) function bound to the
// current URL's language. Replaces react-i18next's useTranslation().
export function useT() {
  const pathname = usePathname();
  const lang = detectLang(pathname);
  return (key) => tForLang(lang, key);
}
