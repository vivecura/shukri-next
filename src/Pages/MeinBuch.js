import Seo from "../Components/Seo";
import { useTranslation } from "react-i18next";

function MeinBuch() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen pt-24 px-4">
      <Seo
        title={t("meinBuch.seoTitle")}
        description={t("meinBuch.seoDescription")}
      />
      <h1 className="text-2xl font-bold">{t("meinBuch.title")}</h1>
    </div>
  );
}

export default MeinBuch;
