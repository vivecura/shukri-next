import PageBody from "@/components/pages/KoerperlicheSymptome";

export const metadata = {
  title: "Körperliche Beschwerden Berlin – Funktionelle Medizin",
  description:
    "Wenn Standardmedizin keine Antworten findet: ursachenorientierte Diagnostik in Berlin für unspezifische und chronische körperliche Symptome.",
  alternates: {
    canonical: "/koerperliche-symptome",
    languages: {
      de: "/koerperliche-symptome",
      en: "/en/physical-symptoms",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
