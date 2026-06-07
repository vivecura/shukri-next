import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { translatePath, detectLang } from "../lib/routeMap";
import { findPairedBlogSlug } from "../lib/blogQueries";
import { getTopicBySlug, getTopicByEnSlug, buildTopicUrl } from "../lib/topics";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const languages = [
    { code: "en", label: "EN", flag: "/Assets/en.png" },
    { code: "de", label: "DE", flag: "/Assets/de.png" },
  ];

  const currentLangCode = detectLang(pathname);

  const changeLanguage = async (lang) => {
    if (lang === currentLangCode) {
      setMenuOpen(false);
      return;
    }

    // 1) Static page: routeMap has it.
    const paired = translatePath(pathname, lang);
    if (paired) {
      i18n.changeLanguage(lang);
      try { localStorage.setItem("lang", lang); } catch (_) {}
      navigate(paired);
      setMenuOpen(false);
      return;
    }

    // 2) Topic page URL: /blog/thema/:slug (DE) or /en/blog/topic/:slug (EN).
    // Resolve via the topics module to find the paired-language URL.
    const topicMatch = pathname.match(/^\/(?:en\/)?blog\/(?:thema|topic)\/(.+)$/);
    if (topicMatch) {
      const currentSlug = topicMatch[1];
      const topic =
        currentLangCode === "en"
          ? getTopicByEnSlug(currentSlug)
          : getTopicBySlug(currentSlug);
      if (topic) {
        i18n.changeLanguage(lang);
        try { localStorage.setItem("lang", lang); } catch (_) {}
        navigate(buildTopicUrl(topic, lang));
        setMenuOpen(false);
        return;
      }
      // Unknown topic slug — fall through to fallback.
    }

    // 3) Blog post URL: extract slug, look up paired translation.
    const blogPostMatch = pathname.match(/^\/(?:en\/)?blog\/(.+)$/);
    if (blogPostMatch) {
      const currentSlug = blogPostMatch[1];
      const pairedSlug = await findPairedBlogSlug(currentSlug, currentLangCode, lang);
      if (pairedSlug) {
        i18n.changeLanguage(lang);
        try { localStorage.setItem("lang", lang); } catch (_) {}
        navigate(lang === "en" ? `/en/blog/${pairedSlug}` : `/blog/${pairedSlug}`);
        setMenuOpen(false);
        return;
      }
      // No translation exists — fall through to fallback.
    }

    // 4) Fallback (unknown URL or no translation): blog index in target lang.
    const fallback = lang === "en" ? "/en/blog" : "/blog";
    i18n.changeLanguage(lang);
    try { localStorage.setItem("lang", lang); } catch (_) {}
    navigate(fallback);
    setMenuOpen(false);
  };

  const currentLang = languages.find((l) => l.code === currentLangCode) || languages[1];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white/70 backdrop-blur-xl rounded-full border border-[#515757]/10 shadow-sm cursor-pointer hover:bg-white hover:shadow-md transition-all duration-300"
      >
        <img src={currentLang.flag} alt={currentLang.label} className="w-5 h-5 rounded-full" />
        <span className="text-[12px] font-medium tracking-[0.1em] text-[#515757]/70">{currentLang.label}</span>
      </button>

      {menuOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white/80 backdrop-blur-xl shadow-lg rounded-xl p-1.5 flex flex-col border border-[#515757]/10">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#515757]/5 rounded-lg transition-colors duration-200"
              onClick={() => changeLanguage(lang.code)}
            >
              <img src={lang.flag} alt={lang.label} className="w-5 h-5 rounded-full" />
              <span className="text-[12px] font-medium tracking-[0.1em] text-[#515757]/70">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
