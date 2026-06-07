"use client";

import { useT } from "@/hooks/useT";

function MeinBuch() {
  const t = useT();
  return (
    <div className="min-h-screen pt-24 px-4">
      <h1 className="text-2xl font-bold">{t("meinBuch.title")}</h1>
    </div>
  );
}

export default MeinBuch;
