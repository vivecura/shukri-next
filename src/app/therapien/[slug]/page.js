import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { scopeBlogHtml, SCOPE_CLASS } from "@/lib/scopeBlogHtml";
import BlogScripts from "@/components/BlogScripts";

// DE slug -> filename in public/therapien-html/
const THERAPY_FILES_DE = {
  "ketamin": "ketamin.html",
  "schwermetall-ausleitung": "schwermetall-ausleitung.html",
  "schimmel-therapie": "schimmel-therapie.html",
  "darm-reset": "darm-reset.html",
  "hormone": "hormone.html",
  "burnout-fix": "burnout-fix.html",
};

// DE slug -> EN slug (for hreflang alternates)
const SLUG_DE_TO_EN = {
  "ketamin": "ketamine",
  "schwermetall-ausleitung": "heavy-metal-detox",
  "schimmel-therapie": "mold-therapy",
  "darm-reset": "gut-reset",
  "hormone": "hormones",
  "burnout-fix": "burnout-fix",
};

// Page <title> values extracted from each public/therapien-html/<file> <title> tag.
// Kept hardcoded so we don't read 6 files just to render metadata.
const THERAPY_TITLES_DE = {
  "ketamin":
    "Ketamin-assistierte Therapie: Hoffnung bei therapieresistenten psychischen Erkrankungen",
  "schwermetall-ausleitung":
    "Schwermetalle: Was wirklich in deinem Körper steckt | Vivecura Berlin",
  "schimmel-therapie": "Schimmel: Das Black Hole der Schulmedizin?",
  "darm-reset":
    "Darm-Reset: Wenn der Körper neu starten muss – Vivecura Berlin",
  "hormone":
    "Hormone in Balance: Testosteron, Östrogen, Progesteron, Cortisol, Vivecura Berlin",
  "burnout-fix":
    "Burnout: Neurobiologie, Diagnostik und integrativer Weg zurück, Vivecura Berlin",
};

// Meta descriptions (ported from _legacy locales/de.json → therapieDetail.descriptions).
const THERAPY_DESCRIPTIONS_DE = {
  "ketamin":
    "Ketamin-assistierte Psychotherapie bei therapieresistenter Depression, Angst und PTBS in Berlin – ärztlich begleitet.",
  "schwermetall-ausleitung":
    "Schwermetall-Ausleitung in Berlin: Diagnostik, Chelat-Therapie und ganzheitliche Begleitung bei Belastungen mit Quecksilber, Blei oder Aluminium.",
  "schimmel-therapie":
    "Schimmelpilz-bedingte Erkrankungen erkennen und behandeln. Mykotoxin-Diagnostik, Bindemittel-Protokolle und Sanierung in Berlin.",
  "darm-reset":
    "Ganzheitliches Darm-Reset-Programm in Berlin: Diagnostik, Eliminationsdiät und gezielter Wiederaufbau des Mikrobioms.",
  "hormone":
    "Bioidentische Hormontherapie in Berlin: Östrogen, Progesteron, Testosteron, Schilddrüse und Cortisol – individuell ausbalanciert.",
  "burnout-fix":
    "Burnout-Behandlung in Berlin: HPA-Achse, Mitochondrien, Schlaf und Regeneration – integrativer Weg zurück zur Energie.",
};

export function generateStaticParams() {
  return Object.keys(THERAPY_FILES_DE).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!THERAPY_FILES_DE[slug]) return {};
  const enSlug = SLUG_DE_TO_EN[slug];
  return {
    title: THERAPY_TITLES_DE[slug] || slug,
    description: THERAPY_DESCRIPTIONS_DE[slug],
    alternates: {
      canonical: `/therapien/${slug}`,
      languages: {
        de: `/therapien/${slug}`,
        en: enSlug ? `/en/therapies/${enSlug}` : undefined,
      },
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const fname = THERAPY_FILES_DE[slug];
  if (!fname) notFound();

  const filePath = path.join(
    process.cwd(),
    "public",
    "therapien-html",
    fname
  );
  let html;
  try {
    html = fs.readFileSync(filePath, "utf-8");
  } catch {
    notFound();
  }

  const { styles, bodyHtml, scripts, hostClasses, hostId, hostStyle } =
    scopeBlogHtml(html);

  return (
    <article
      className={[SCOPE_CLASS, ...hostClasses].join(" ").trim()}
      id={hostId || undefined}
      style={hostStyle ? { all: "initial" } : undefined}
    >
      {styles.map((css, i) => (
        <style key={i} dangerouslySetInnerHTML={{ __html: css }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <BlogScripts scripts={scripts} />
    </article>
  );
}

