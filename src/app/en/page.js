import PageBody from "@/components/pages/Home";

export const metadata = {
  title: "ViveCura – Functional Medicine, Prevention & Longevity in Berlin",
  description:
    "Practice for functional medicine, prevention, longevity and psychotherapy in Berlin. Holistic diagnostics and personalized therapies.",
  alternates: {
    canonical: "/en",
    languages: { de: "/", en: "/en" },
  },
};

export default function Page() {
  return <PageBody />;
}
