import PageBody from "@/components/pages/Beratung";

export const metadata = {
  title: "Medical Consultation Berlin – Functional Medicine",
  description:
    "Personal medical consultation in Berlin: initial assessment, second opinion, and individual treatment planning in functional medicine.",
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
