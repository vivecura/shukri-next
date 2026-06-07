// src/hooks/useLanguage.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { detectLang } from "../lib/routeMap";

// Reads language from the URL on every navigation, syncs i18n state.
// Returns the current language ('de' | 'en').
export default function useLanguage() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const lang = detectLang(pathname);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    try {
      localStorage.setItem("lang", lang);
    } catch (_) { /* private mode */ }
  }, [lang, i18n]);

  return lang;
}
