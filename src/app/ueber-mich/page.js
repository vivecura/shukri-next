import PageBody from "@/components/pages/UeberMich";

export const metadata = {
  title: "Über Dr. Shukri Jarmoukli – Funktionelle Medizin Berlin",
  description:
    "Internist, funktionelle Medizin und Longevity-Spezialist in Berlin. Erfahrung, Ausbildung und der ganzheitliche Behandlungsansatz von Dr. Shukri Jarmoukli.",
  alternates: {
    canonical: "/ueber-mich",
    languages: {
      de: "/ueber-mich",
      en: "/en/about",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
