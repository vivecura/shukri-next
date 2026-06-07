import PageBody from "@/components/pages/Beratung";

export const metadata = {
  title: "Ärztliche Beratung Berlin – Funktionelle Medizin",
  description:
    "Persönliche ärztliche Beratung in Berlin: Erstgespräch, Zweitmeinung und individuelle Therapieplanung in der funktionellen Medizin.",
  alternates: {
    canonical: "/beratung",
    languages: {
      de: "/beratung",
      en: "/en/consultations",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
