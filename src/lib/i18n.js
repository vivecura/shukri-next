import de from "@/locales/de.json";
import en from "@/locales/en.json";

const TRANSLATIONS = { de, en };

function lookup(obj, key) {
  const parts = key.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

// Pure translation lookup. Server-safe (no React hooks). Use this directly
// when you already know the language (e.g. in a Server Component that knows
// the URL). For client components, prefer the useT() hook in src/hooks/useT.js.
export function tForLang(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.de;
  const fallback = TRANSLATIONS.de;
  const value = lookup(dict, key);
  if (value !== null) return value;
  const fallbackValue = lookup(fallback, key);
  return fallbackValue !== null ? fallbackValue : key;
}
