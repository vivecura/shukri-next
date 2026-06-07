import PageBody from "@/components/pages/Kontakt";

export const metadata = {
  title: "Kontakt – Rückruf-Termin vereinbaren",
  description:
    "Schreib uns über das Kontaktformular. Wir melden uns persönlich bei dir und planen einen 5-Minuten-Rückruf.",
  alternates: {
    canonical: "/kontakt",
    languages: {
      de: "/kontakt",
      en: "/en/contact",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
