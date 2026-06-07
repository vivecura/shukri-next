import PageBody from "@/components/pages/HealthCheck";

export const metadata = {
  title: "Diagnostik Berlin – Funktionelle Medizin Labor & Analyse",
  description:
    "Erweiterte Diagnostik in Berlin: Genetik, Vollblutanalyse, BIA, HRV, Mikrobiom, Schwermetalle. Ganzheitlicher Health Check als Grundlage für gezielte Therapie.",
  alternates: {
    canonical: "/diagnostik",
    languages: {
      de: "/diagnostik",
      en: "/en/diagnostics",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
