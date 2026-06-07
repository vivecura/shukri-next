import PageBody from "@/components/pages/LegalNotice";

export const metadata = {
  title: "Legal Notice — Imprint & Privacy",
  description:
    "Legal notice and privacy policy for the private medical practice of Shukri Jarmoukli (Vivecura) in Berlin.",
  alternates: {
    canonical: "/en/legal-notice",
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
