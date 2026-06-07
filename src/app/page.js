import PageBody from "@/components/pages/Home";

export const metadata = {
  title: "ViveCura – Funktionelle Medizin, Prävention & Longevity in Berlin",
  description:
    "Praxis für funktionelle Medizin, Prävention, Longevity und Psychotherapie in Berlin. Ganzheitliche Diagnostik und personalisierte Therapien.",
  alternates: {
    canonical: "/",
    languages: { de: "/", en: "/en" },
  },
};

export default function Page() {
  return <PageBody />;
}
