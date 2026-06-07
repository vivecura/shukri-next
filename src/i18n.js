import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import de from "./locales/de.json";

// Read persisted choice if any. The URL-based detection in useLanguage will
// override this on first render — this initial value just prevents a flash
// for SPAs that boot before the router runs.
let initialLang = "de";
try {
  const fromUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/en")
    ? "en"
    : null;
  const fromStorage = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
  initialLang = fromUrl || fromStorage || "de";
} catch (_) { /* SSR / private mode */ }

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: initialLang,
  fallbackLng: "de",
  interpolation: { escapeValue: false },
});

export default i18n;
