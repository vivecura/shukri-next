import PageBody from "@/components/pages/LegalNotice";

export const metadata = {
  title: "Rechtliches – Impressum & Datenschutz",
  description:
    "Impressum und Datenschutzerklärung der Ärztlichen Privatpraxis Shukri Jarmoukli (Vivecura) in Berlin.",
  alternates: {
    canonical: "/rechtliches",
    languages: {
      de: "/rechtliches",
      en: "/en/legal-notice",
    },
  },
  robots: "noindex, follow",
};

export default function Page() {
  return <PageBody />;
}
