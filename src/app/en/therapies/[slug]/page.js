import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { scopeBlogHtml, SCOPE_CLASS } from "@/lib/scopeBlogHtml";
import BlogScripts from "@/components/BlogScripts";

// EN slug -> filename in public/therapien-html/
const THERAPY_FILES_EN = {
  "ketamine": "ketamine-en.html",
  "heavy-metal-detox": "heavy-metal-detox-en.html",
  "mold-therapy": "mold-therapy-en.html",
  "gut-reset": "gut-reset-en.html",
  "hormones": "hormones-en.html",
  "burnout-fix": "burnout-fix-en.html",
};

// EN slug -> DE slug (for hreflang alternates)
const SLUG_EN_TO_DE = {
  "ketamine": "ketamin",
  "heavy-metal-detox": "schwermetall-ausleitung",
  "mold-therapy": "schimmel-therapie",
  "gut-reset": "darm-reset",
  "hormones": "hormone",
  "burnout-fix": "burnout-fix",
};

// Page <title> values extracted from each public/therapien-html/<file> <title> tag.
const THERAPY_TITLES_EN = {
  "ketamine":
    "Ketamine-Assisted Therapy: Hope for Treatment-Resistant Mental Health Conditions",
  "heavy-metal-detox":
    "Heavy Metals: What's Really Inside Your Body | Vivecura Berlin",
  "mold-therapy": "Mold: The Black Hole of Conventional Medicine?",
  "gut-reset": "Gut Reset: When the Body Needs to Restart – Vivecura Berlin",
  "hormones":
    "Hormones in Balance: Testosterone, Estrogen, Progesterone, Cortisol, Vivecura Berlin",
  "burnout-fix":
    "Burnout: Neurobiology, Diagnostics and an Integrative Way Back, Vivecura Berlin",
};

// Meta descriptions (ported from _legacy locales/en.json → therapieDetail.descriptions).
const THERAPY_DESCRIPTIONS_EN = {
  "ketamine":
    "Ketamine-assisted psychotherapy for treatment-resistant depression, anxiety and PTSD in Berlin — physician-supervised.",
  "heavy-metal-detox":
    "Heavy-metal detoxification in Berlin: diagnostics, chelation therapy and holistic support for mercury, lead and aluminum burdens.",
  "mold-therapy":
    "Recognize and treat mold-related illness. Mycotoxin testing, binder protocols and remediation guidance in Berlin.",
  "gut-reset":
    "Holistic gut-reset program in Berlin: diagnostics, elimination diet and targeted microbiome rebuilding.",
  "hormones":
    "Bioidentical hormone therapy in Berlin: estrogen, progesterone, testosterone, thyroid and cortisol — individually balanced.",
  "burnout-fix":
    "Burnout treatment in Berlin: HPA axis, mitochondria, sleep and recovery — an integrative path back to energy.",
};

export function generateStaticParams() {
  return Object.keys(THERAPY_FILES_EN).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!THERAPY_FILES_EN[slug]) return {};
  const deSlug = SLUG_EN_TO_DE[slug];
  return {
    title: THERAPY_TITLES_EN[slug] || slug,
    description: THERAPY_DESCRIPTIONS_EN[slug],
    alternates: {
      canonical: `/en/therapies/${slug}`,
      languages: {
        en: `/en/therapies/${slug}`,
        de: deSlug ? `/therapien/${deSlug}` : undefined,
      },
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const fname = THERAPY_FILES_EN[slug];
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

