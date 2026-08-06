import PageBody from "@/components/pages/DiagnostikNew";

export const metadata = {
  title: "Diagnostics Berlin – Functional Medicine Lab & Analysis",
  description:
    "Advanced diagnostics in Berlin: genetics, whole-blood analysis, BIA, HRV, microbiome, heavy metals. Holistic health check as the foundation for targeted therapy.",
  alternates: {
    canonical: "/en/diagnostics",
    languages: {
      de: "/diagnostik",
      en: "/en/diagnostics",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
