import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";
import { translatePath } from "../lib/routeMap";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/vivecura/",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/shukri-jarmoukli/",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="3" />
        <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 014 0v4M11 10v7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@shukri.jarmoukli",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@shukrijarmoukli",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect x="2" y="4" width="20" height="16" rx="4" />
        <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export default function Footer() {
  const { t } = useTranslation();
  const lang = useLanguage();

  const localized = (dePath) => {
    if (lang !== "en") return dePath;
    const mapped = translatePath(dePath, "en");
    return mapped || dePath;
  };

  // Anchor-aware localizer for paths like "/rechtliches#impressum"
  const localizedAnchor = (dePathWithHash) => {
    const [base, hash] = dePathWithHash.split("#");
    const localizedBase = localized(base);
    return hash ? `${localizedBase}#${hash}` : localizedBase;
  };

  const footerLinks = {
    praxis: [
      { label: t("footer.links.koerperlicheSymptome"), to: localized("/koerperliche-symptome") },
      { label: t("footer.links.praeventionLongevity"), to: localized("/praevention-longevity") },
      { label: t("footer.links.psychotherapie"), to: localized("/psychotherapie") },
    ],
    angebot: [
      { label: t("footer.links.infusionen"), to: localized("/infusions") },
      { label: t("footer.links.diagnostik"), to: localized("/diagnostik") },
      { label: t("footer.links.beratungen"), to: localized("/beratung") },
      { label: t("footer.links.ketaminTherapie"), to: localized("/ketamin") },
      { label: t("footer.links.mentoring"), to: localized("/mentoring") },
    ],
    kontakt: [
      { label: t("kontakt.footerLabel"), to: localized("/kontakt") },
      { label: "030 200060860", to: null, href: "tel:030200060860" },
      { label: "praxis@vivecura.com", to: null, href: "mailto:praxis@vivecura.com" },
    ],
  };

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-10">

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:w-[30%]">
            <span className="text-lg font-semibold tracking-[0.12em] uppercase text-[#43a9ab]">
              ViveCura
            </span>
            <p className="text-[#515757]/50 text-sm leading-relaxed mt-4 max-w-xs">
              {t("footer.tagline")}
            </p>

            <div className="flex items-center gap-4 mt-6">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-[#515757]/30 hover:text-[#43a9ab] transition-colors duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {Object.entries(footerLinks).map(([headingKey, links]) => (
              <div key={headingKey}>
                <h4 className="text-[#43a9ab] text-xs font-semibold tracking-[2px] uppercase mb-4">
                  {t(`footer.headings.${headingKey}`)}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.to ? (
                        <Link
                          to={link.to}
                          className="text-[#515757]/50 text-sm hover:text-[#43a9ab] transition-colors duration-200 no-underline"
                        >
                          {link.label}
                        </Link>
                      ) : link.href ? (
                        <a
                          href={link.href}
                          target={link.href.startsWith("http") ? "_blank" : undefined}
                          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-[#515757]/50 text-sm hover:text-[#43a9ab] transition-colors duration-200 no-underline"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <span className="text-[#515757]/50 text-sm">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#515757]/30 text-xs">
            &copy; {new Date().getFullYear()} ViveCura. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-6">
            <Link to={localizedAnchor("/rechtliches#impressum")} className="text-[#515757]/30 text-xs hover:text-[#515757]/60 transition-colors no-underline">
              {t("footer.impressum")}
            </Link>
            <Link to={localizedAnchor("/rechtliches#datenschutz")} className="text-[#515757]/30 text-xs hover:text-[#515757]/60 transition-colors no-underline">
              {t("footer.datenschutz")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
