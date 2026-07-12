import PageBody from "@/components/pages/UeberMich";

export const metadata = {
  title: "About Shukri Jarmoukli – Functional Medicine Berlin",
  description:
    "Internist, functional medicine and longevity specialist in Berlin. Experience, training, and the holistic treatment approach of Shukri Jarmoukli.",
  alternates: {
    canonical: "/en/about",
    languages: {
      de: "/ueber-mich",
      en: "/en/about",
    },
  },
};

export default function Page() {
  return <PageBody />;
}
