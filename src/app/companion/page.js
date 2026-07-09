// src/app/companion/page.js
//
// Die komplette Patienten-App lebt auf EINER Route (Tab-State clientseitig,
// keine Sub-Routen). Dünne Server-Page nach Haus-Konvention — alles Weitere
// macht die Client-Shell <CompanionApp/>.

import CompanionApp from "@/components/pages/CompanionApp";

export const metadata = {
  title: "ViveCura Companion",
  robots: "noindex, nofollow",
};

export default function CompanionPage() {
  return <CompanionApp />;
}
