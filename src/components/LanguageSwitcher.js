"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { translatePath, detectLang } from "@/lib/routeMap";
import { findPairedBlogSlug } from "@/lib/blogQueries.client";
import { getTopicBySlug, getTopicByEnSlug, buildTopicUrl } from "@/lib/topics";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
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
      try { localStorage.setItem("lang", lang); } catch (_) {}
      router.push(paired);
      setMenuOpen(false);
      return;
    }

    // 2) Topic page URL: /blog/thema/:slug (DE) or /en/blog/topic/:slug (EN).
    const topicMatch = pathname.match(/^\/(?:en\/)?blog\/(?:thema|topic)\/(.+)$/);
    if (topicMatch) {
      const currentSlug = topicMatch[1];
      const topic =
        currentLangCode === "en"
          ? getTopicByEnSlug(currentSlug)
          : getTopicBySlug(currentSlug);
      if (topic) {
        try { localStorage.setItem("lang", lang); } catch (_) {}
        router.push(buildTopicUrl(topic, lang));
        setMenuOpen(false);
        return;
      }
    }

    // 3) Blog post URL: look up paired translation in DB.
    const blogPostMatch = pathname.match(/^\/(?:en\/)?blog\/(.+)$/);
    if (blogPostMatch) {
      const currentSlug = blogPostMatch[1];
      const pairedSlug = await findPairedBlogSlug(currentSlug, currentLangCode, lang);
      if (pairedSlug) {
        try { localStorage.setItem("lang", lang); } catch (_) {}
        router.push(lang === "en" ? `/en/blog/${pairedSlug}` : `/blog/${pairedSlug}`);
        setMenuOpen(false);
        return;
      }
    }

    // 4) Fallback: blog index in target lang.
    const fallback = lang === "en" ? "/en/blog" : "/blog";
    try { localStorage.setItem("lang", lang); } catch (_) {}
    router.push(fallback);
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
}
