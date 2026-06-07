import HonorarForm from "@/components/pages/HonorarForm";
import { HONORAR_FORMS } from "@/lib/honorarForms";

export function generateStaticParams() {
  return HONORAR_FORMS.map((f) => ({ slug: f.slug }));
}

export const metadata = {
  title: "Honorarvereinbarung – ViveCura",
  robots: "noindex, nofollow",
};

export default function Page() {
  return <HonorarForm />;
}
