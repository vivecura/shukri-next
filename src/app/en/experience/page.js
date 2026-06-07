import PageBody from "@/components/pages/Experience";

export const metadata = {
  title: "Vivecura Experience – Longevity Experience Berlin",
  description:
    "The Vivecura Experience – a structured day centered on diagnostics, consultation and longevity methods in Berlin.",
  alternates: {
    canonical: "/en/experience",
    languages: {
      de: "/experience",
      en: "/en/experience",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
