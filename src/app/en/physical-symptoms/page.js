import PageBody from "@/components/pages/KoerperlicheSymptome";

export const metadata = {
  title: "Physical Symptoms Berlin – Functional Medicine",
  description:
    "When standard medicine has no answers: root-cause diagnostics in Berlin for unspecific and chronic physical symptoms.",
  alternates: {
    canonical: "/en/physical-symptoms",
    languages: {
      de: "/koerperliche-symptome",
      en: "/en/physical-symptoms",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
