import PageBody from "@/components/pages/Kontakt";

export const metadata = {
  title: "Contact – Schedule a callback",
  description:
    "Reach out through our contact form. We'll get back to you personally and schedule a 5-minute callback.",
  alternates: {
    canonical: "/en/contact",
    languages: {
      de: "/kontakt",
      en: "/en/contact",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
