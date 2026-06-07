import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { detectLang } from "../lib/routeMap";

export default function HtmlLang() {
  const { pathname } = useLocation();
  const lang = detectLang(pathname);
  return (
    <Helmet>
      <html lang={lang} />
    </Helmet>
  );
}
