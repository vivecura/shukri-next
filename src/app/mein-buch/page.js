import PageBody from "@/components/pages/MeinBuch";

export const metadata = {
  title: "Mein Buch – Shukri Jarmoukli",
  description:
    "Das Buch von Shukri Jarmoukli zu funktioneller Medizin, Prävention und Longevity – ein Wegweiser für nachhaltige Gesundheit.",
  alternates: {
    canonical: "/mein-buch",
    languages: {
      de: "/mein-buch",
      en: "/en/my-book",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
