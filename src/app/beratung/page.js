import PageBody from "@/components/pages/Beratung";

export const metadata = {
  title: "Ganzheitliche Beratung Berlin & Online – Ursachen finden | ViveCura",
  description:
    "Ärztliche Beratung in Berlin oder online per Video: interdisziplinärer Blick auf alle Beschwerden, passende Diagnostik und ein erster Plan. 30 Minuten für 100 €.",
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
