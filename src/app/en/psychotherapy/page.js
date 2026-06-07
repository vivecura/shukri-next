import PageBody from "@/components/pages/Psychotherapie";

export const metadata = {
  title: "Psychotherapy & Ketamine-Assisted Therapy Berlin",
  description:
    "Psychotherapeutic support and ketamine-assisted approaches in Berlin — an integrative approach for depression, trauma and chronic stress.",
  alternates: {
    canonical: "/en/psychotherapy",
    languages: {
      de: "/psychotherapie",
      en: "/en/psychotherapy",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
