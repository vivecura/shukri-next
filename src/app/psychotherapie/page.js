import PageBody from "@/components/pages/Psychotherapie";

export const metadata = {
  title: "Psychotherapie & Ketamin-assistierte Therapie Berlin",
  description:
    "Psychotherapeutische Begleitung und Ketamin-assistierte Verfahren in Berlin – integrativer Ansatz für Depression, Trauma und chronischen Stress.",
  alternates: {
    canonical: "/psychotherapie",
    languages: {
      de: "/psychotherapie",
      en: "/en/psychotherapy",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
