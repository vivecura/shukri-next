import PageBody from "@/components/pages/Infusions";

export const metadata = {
  title: "Infusionstherapie Berlin – NAD+, Vitamin C, Aminosäuren",
  description:
    "Hochdosierte Infusionstherapien in Berlin: NAD+, Vitamin C, Glutathion, Aminosäuren, Mikronährstoffe. Ärztlich indiziert und individuell zusammengestellt.",
  alternates: {
    canonical: "/infusions",
    languages: {
      de: "/infusions",
      en: "/en/infusions",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
