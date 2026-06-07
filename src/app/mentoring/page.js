import PageBody from "@/components/pages/Mentoring";

export const metadata = {
  title: "1:1 Mentoring – Longevity & Gesundheit Berlin",
  description:
    "Persönliches 1:1 Mentoring zur Umsetzung individueller Longevity- und Gesundheitsstrategien – ärztlich begleitet, alltagstauglich und messbar.",
  alternates: {
    canonical: "/mentoring",
    languages: {
      de: "/mentoring",
      en: "/en/mentoring",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
