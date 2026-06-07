import PageBody from "@/components/pages/Experience";

export const metadata = {
  title: "Vivecura Experience – Longevity Erlebnis Berlin",
  description:
    "Das Vivecura Experience – ein strukturierter Tag rund um Diagnostik, Beratung und Longevity-Methoden in Berlin.",
  alternates: {
    canonical: "/experience",
    languages: {
      de: "/experience",
      en: "/en/experience",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
