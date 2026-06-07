import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../Components/Seo";

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28 mb-16 sm:mb-20">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#43A9AB] tracking-tight mb-8 sm:mb-10 leading-tight">
        {title}
      </h1>
      <div className="space-y-6 text-[#515757] text-sm sm:text-base leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Block({ heading, children }) {
  return (
    <div>
      {heading && (
        <h2 className="text-lg sm:text-xl font-bold text-[#515757] mb-3">{heading}</h2>
      )}
      <div className="space-y-3 text-[#515757]/80">{children}</div>
    </div>
  );
}

function Address({ lines }) {
  return (
    <p className="whitespace-pre-line text-[#515757]/80">{lines.join("\n")}</p>
  );
}

export default function LegalNotice() {
  const { hash } = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.replace("#", ""));
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [hash]);

  const professionalRules = t("legal.impressum.professionalRules.list", { returnObjects: true });
  const dataTypes = t("legal.privacy.dataTypes.list", { returnObjects: true });
  const socialNetworks = t("legal.privacy.socialNetworks.list", { returnObjects: true });
  const recipients = t("legal.privacy.recipients.list", { returnObjects: true });
  const transferMechanisms = t("legal.privacy.dataTransfer.list", { returnObjects: true });
  const retentionList = t("legal.privacy.retention.list", { returnObjects: true });
  const dataSubjectRights = t("legal.privacy.rights.list", { returnObjects: true });

  return (
    <div className="bg-white min-h-screen pt-28 sm:pt-32 pb-20">
      <Seo
        title={t("legal.seoTitle")}
        description={t("legal.seoDescription")}
      />
      <div className="max-w-3xl mx-auto px-5 sm:px-8">

        <nav className="flex flex-wrap gap-3 mb-12 sm:mb-16 text-sm">
          <a href="#impressum" className="px-4 py-2 rounded-full border border-[#43a9ab]/30 text-[#43a9ab] font-semibold hover:bg-[#43a9ab]/5 no-underline transition-colors">
            {t("legal.nav.impressum")}
          </a>
          <a href="#datenschutz" className="px-4 py-2 rounded-full border border-[#43a9ab]/30 text-[#43a9ab] font-semibold hover:bg-[#43a9ab]/5 no-underline transition-colors">
            {t("legal.nav.privacy")}
          </a>
        </nav>

        <Section id="impressum" title={t("legal.impressum.title")}>
          <Block heading={t("legal.impressum.tmgInfo.heading")}>
            <p>{t("legal.impressum.tmgInfo.line1")}<br />{t("legal.impressum.tmgInfo.line2")}<br />{t("legal.impressum.tmgInfo.line3")}</p>
            <Address lines={["Skalitzer Straße 137", "10999 Berlin", t("legal.impressum.tmgInfo.country")]} />
          </Block>

          <Block heading={t("legal.impressum.contact.heading")}>
            <p>
              {t("legal.impressum.contact.phoneLabel")}: <a href="tel:030200060860" className="text-[#43a9ab] no-underline hover:underline">030 200060860</a>
              <br />
              {t("legal.impressum.contact.emailLabel")}: <a href="mailto:praxis@vivecura.com" className="text-[#43a9ab] no-underline hover:underline">praxis@vivecura.com</a>
            </p>
          </Block>

          <Block heading={t("legal.impressum.responsible.heading")}>
            <Address lines={["Shukri Jarmoukli", "Skalitzer Straße 137", "10999 Berlin"]} />
          </Block>

          <Block heading={t("legal.impressum.professionalRules.heading")}>
            <p>{t("legal.impressum.professionalRules.title")}<br />{t("legal.impressum.professionalRules.granted")}</p>
            <p>
              {t("legal.impressum.professionalRules.chamberLabel")}<br />
              Ärztekammer Berlin<br />
              Friedrichstraße 16<br />
              10969 Berlin<br />
              <a href="https://www.aerztekammer-berlin.de" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">www.aerztekammer-berlin.de</a>
            </p>
            <p>
              {t("legal.impressum.professionalRules.supervisoryLabel")}<br />
              {t("legal.impressum.professionalRules.supervisoryName")}<br />
              Turmstraße 21, 10559 Berlin
            </p>
            <p>{t("legal.impressum.professionalRules.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(professionalRules) && professionalRules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
            <p>
              {t("legal.impressum.professionalRules.viewableAt")}
              <br />
              <a href="https://www.aerztekammer-berlin.de" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">www.aerztekammer-berlin.de</a>
              <br />
              <a href="https://www.bundesaerztekammer.de" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">www.bundesaerztekammer.de</a>
            </p>
          </Block>

          <Block heading={t("legal.impressum.insurance.heading")}>
            <Address lines={["Deutsche Ärzteversicherung Allgemeine", "Zweigniederlassung der AXA Versicherung AG", "51171 Köln", t("legal.impressum.insurance.country")]} />
            <p>{t("legal.impressum.insurance.scope")}</p>
          </Block>

          <Block heading={t("legal.impressum.vat.heading")}>
            <p>{t("legal.impressum.vat.text")}</p>
          </Block>

          <Block heading={t("legal.impressum.euDispute.heading")}>
            <p>
              {t("legal.impressum.euDispute.before")} {" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">ec.europa.eu/consumers/odr</a>.
              {" "}{t("legal.impressum.euDispute.after")}
            </p>
          </Block>

          <Block heading={t("legal.impressum.consumerDispute.heading")}>
            <p>{t("legal.impressum.consumerDispute.text")}</p>
          </Block>

          <Block heading={t("legal.impressum.contentLiability.heading")}>
            <p>{t("legal.impressum.contentLiability.p1")}</p>
            <p>{t("legal.impressum.contentLiability.p2")}</p>
          </Block>

          <Block heading={t("legal.impressum.linkLiability.heading")}>
            <p>{t("legal.impressum.linkLiability.p1")}</p>
            <p>{t("legal.impressum.linkLiability.p2")}</p>
          </Block>

          <Block heading={t("legal.impressum.copyright.heading")}>
            <p>{t("legal.impressum.copyright.p1")}</p>
            <p>{t("legal.impressum.copyright.p2")}</p>
          </Block>

          <p className="text-[#515757]/50 text-xs pt-4">{t("legal.lastUpdated")}</p>
        </Section>

        <div className="h-px bg-[#515757]/10 mb-16 sm:mb-20" />

        <Section id="datenschutz" title={t("legal.privacy.title")}>
          <p className="text-[#515757]/60 text-xs uppercase tracking-wider">{t("legal.privacy.statusLine")}</p>

          <Block heading={t("legal.privacy.controller.heading")}>
            <Address lines={[
              "Shukri Jarmoukli",
              t("legal.privacy.controller.line2"),
              "Skalitzer Straße 137",
              "10999 Berlin",
              t("legal.privacy.controller.country"),
            ]} />
            <p>
              {t("legal.privacy.controller.phoneLabel")}: <a href="tel:030200060860" className="text-[#43a9ab] no-underline hover:underline">030 200060860</a>
              <br />
              {t("legal.privacy.controller.emailLabel")}: <a href="mailto:praxis@vivecura.com" className="text-[#43a9ab] no-underline hover:underline">praxis@vivecura.com</a>
            </p>
          </Block>

          <Block heading={t("legal.privacy.intro.heading")}>
            <p>{t("legal.privacy.intro.text")}</p>
          </Block>

          <Block heading={t("legal.privacy.dataTypes.heading")}>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(dataTypes) && dataTypes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Block>

          <Block heading={t("legal.privacy.healthData.heading")}>
            <p>{t("legal.privacy.healthData.text")}</p>
          </Block>

          <Block heading={t("legal.privacy.hosting.heading")}>
            <p>{t("legal.privacy.hosting.p1")}</p>
            <p>{t("legal.privacy.hosting.p2")}</p>
            <p>{t("legal.privacy.hosting.legalBasis")}</p>
            <p>{t("legal.privacy.hosting.transfer")}</p>
          </Block>

          <Block heading={t("legal.privacy.fonts.heading")}>
            <p>{t("legal.privacy.fonts.text")}</p>
          </Block>

          <Block heading={t("legal.privacy.doctolib.heading")}>
            <p>{t("legal.privacy.doctolib.p1")}</p>
            <p>
              {t("legal.privacy.doctolib.p2")} {" "}
              <a href="https://www.doctolib.de/terms/privacy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">doctolib.de/terms/privacy</a>.
            </p>
            <p>{t("legal.privacy.doctolib.legalBasis")}</p>
          </Block>

          <Block heading={t("legal.privacy.youtube.heading")}>
            <p>{t("legal.privacy.youtube.p1")}</p>
            <p>{t("legal.privacy.youtube.p2")}</p>
            <p>{t("legal.privacy.youtube.legalBasis")}</p>
            <p>
              {t("legal.privacy.youtube.googlePolicy")} {" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">policies.google.com/privacy</a>
            </p>
          </Block>

          <Block heading={t("legal.privacy.socialNetworks.heading")}>
            <p>{t("legal.privacy.socialNetworks.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(socialNetworks) && socialNetworks.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("legal.privacy.socialNetworks.note")}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">Instagram</a></li>
              <li><a href="https://www.tiktok.com/legal/page/eea/privacy-policy/de" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">TikTok</a></li>
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">YouTube / Google</a></li>
              <li><a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">LinkedIn</a></li>
            </ul>
          </Block>

          <Block heading={t("legal.privacy.analytics.heading")}>
            <p>{t("legal.privacy.analytics.p1")}</p>
            <p>{t("legal.privacy.analytics.p2")}</p>
            <p>{t("legal.privacy.analytics.purpose")}</p>
            <p>{t("legal.privacy.analytics.dataProcessed")}</p>
            <p>{t("legal.privacy.analytics.legalBasis")}</p>
            <p>{t("legal.privacy.analytics.transfer")}</p>
            <p>{t("legal.privacy.analytics.retention")}</p>
            <p>
              {t("legal.privacy.analytics.moreInfo")} {" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">policies.google.com/privacy</a>
            </p>
          </Block>

          <Block heading={t("legal.privacy.googleAds.heading")}>
            <p>{t("legal.privacy.googleAds.p1")}</p>
            <p>{t("legal.privacy.googleAds.p2")}</p>
            <p>{t("legal.privacy.googleAds.purpose")}</p>
            <p>{t("legal.privacy.googleAds.dataProcessed")}</p>
            <p>{t("legal.privacy.googleAds.legalBasis")}</p>
            <p>{t("legal.privacy.googleAds.transfer")}</p>
          </Block>

          <Block heading={t("legal.privacy.cookies.heading")}>
            <p>{t("legal.privacy.cookies.p1")}</p>
            <p>{t("legal.privacy.cookies.p2")}</p>
            <p>{t("legal.privacy.cookies.p3")}</p>
            <p>{t("legal.privacy.cookies.p4")}</p>
          </Block>

          <Block heading={t("legal.privacy.recipients.heading")}>
            <p>{t("legal.privacy.recipients.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(recipients) && recipients.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Block>

          <Block heading={t("legal.privacy.dataTransfer.heading")}>
            <p>{t("legal.privacy.dataTransfer.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(transferMechanisms) && transferMechanisms.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Block>

          <Block heading={t("legal.privacy.retention.heading")}>
            <p>{t("legal.privacy.retention.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(retentionList) && retentionList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Block>

          <Block heading={t("legal.privacy.rights.heading")}>
            <p>{t("legal.privacy.rights.intro")}</p>
            <ul className="list-disc pl-5 space-y-1">
              {Array.isArray(dataSubjectRights) && dataSubjectRights.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>
              {t("legal.privacy.rights.exercise")} {" "}
              <a href="mailto:praxis@vivecura.com" className="text-[#43a9ab] no-underline hover:underline">praxis@vivecura.com</a>.
            </p>
            <p>{t("legal.privacy.rights.complaint")}</p>
            <p>
              {t("legal.privacy.rights.authorityLabel")}
              <br />
              {t("legal.privacy.rights.authorityName")}
              <br />
              Alt-Moabit 59-61, 10555 Berlin, {t("legal.privacy.rights.country")}
              <br />
              {t("legal.privacy.rights.phoneLabel")}: +49 (0)30 13889-0
              <br />
              {t("legal.privacy.rights.emailLabel")}: <a href="mailto:mailbox@datenschutz-berlin.de" className="text-[#43a9ab] no-underline hover:underline">mailbox@datenschutz-berlin.de</a>
              <br />
              {t("legal.privacy.rights.websiteLabel")}: <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer" className="text-[#43a9ab] no-underline hover:underline">datenschutz-berlin.de</a>
            </p>
          </Block>

          <Block heading={t("legal.privacy.changes.heading")}>
            <p>{t("legal.privacy.changes.text")}</p>
          </Block>

          <p className="text-[#515757]/50 text-xs pt-4">{t("legal.lastUpdated")}</p>
        </Section>

      </div>
    </div>
  );
}
