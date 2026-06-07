import PageBody from "@/components/pages/Mentoring";

export const metadata = {
  title: "1:1 Mentoring – Longevity & Health Berlin",
  description:
    "Personal 1:1 mentoring for putting individual longevity and health strategies into practice — physician-guided, practical, and measurable.",
  alternates: {
    canonical: "/en/mentoring",
    languages: {
      de: "/mentoring",
      en: "/en/mentoring",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
