// src/app/anamnese/page.js
//
// Internal patient intake tool. Iframes the standalone form at
// /anamnese.html. noindex – not for public discovery.

import AnamneseBody from "@/components/pages/Anamnese";

export const metadata = {
  title: "Anamnese – ViveCura",
  robots: "noindex, nofollow",
};

export default function AnamnesePage() {
  return <AnamneseBody />;
}
