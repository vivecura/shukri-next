import PageBody from "@/components/pages/Beratung";

export const metadata = {
  title: "Holistic Consultation Berlin & Online – Finding Causes | ViveCura",
  description:
    "Medical consultation in Berlin or online by video: an interdisciplinary view of all symptoms, fitting diagnostics and a first plan. 30 minutes for €100.",
  alternates: {
    canonical: "/en/consultations",
    languages: {
      de: "/beratung",
      en: "/en/consultations",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
