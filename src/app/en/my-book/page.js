import PageBody from "@/components/pages/MeinBuch";

export const metadata = {
  title: "My Book – Shukri Jarmoukli",
  description:
    "The book by Shukri Jarmoukli on functional medicine, prevention, and longevity – a guide to sustainable health.",
  alternates: {
    canonical: "/en/my-book",
    languages: {
      de: "/mein-buch",
      en: "/en/my-book",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
