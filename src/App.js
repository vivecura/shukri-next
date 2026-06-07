import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./Components/Navbar";
import Home from "./Pages/Home";
import Blog from "./Pages/Blog";
import BlogPost from "./Pages/BlogPost";
import BlogTopic from "./Pages/BlogTopic";
import Admin from "./Pages/Admin";
import BlogEditor from "./Pages/BlogEditor";
import MeinBuch from "./Pages/MeinBuch";
import SpezielleTherapien from "./Pages/SpezielleTherapien";
import HealthCheck from "./Pages/HealthCheck";
import Experience from "./Pages/Experience";
import Infusions from "./Pages/Infusions";
import UeberMich from "./Pages/UeberMich";
import Extras from "./Pages/Extras";
import KoerperlicheSymptome from "./Pages/KoerperlicheSymptome";
import PraeventionLongevity from "./Pages/PraeventionLongevity";
import Psychotherapie from "./Pages/Psychotherapie";
import Beratung from "./Pages/Beratung";
import Mentoring from "./Pages/Mentoring";
import TherapieDetail from "./Pages/TherapieDetail";
import LegalNotice from "./Pages/LegalNotice";
import Kontakt from "./Pages/Kontakt";
import HonorarHub from "./Pages/HonorarHub";
import HonorarForm from "./Pages/HonorarForm";
import Anamnese from "./Pages/Anamnese";
import Footer from "./Components/Footer";
import LanguageSwitcher from "./Components/LanguageSwitcher";
import HtmlLang from "./Components/HtmlLang";
import useLanguage from "./hooks/useLanguage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LanguageActivator() {
  useLanguage();
  return null;
}

// Standalone iPad/phone tools (Honorar, Anamnese) render without the site
// chrome: no navbar, footer or language switcher.
function isStandalone(pathname) {
  return pathname.startsWith("/honorar") || pathname.startsWith("/anamnese");
}

function ConditionalSwitcher() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || isStandalone(pathname)) return null;
  return <LanguageSwitcher />;
}

function ConditionalNavbar() {
  const { pathname } = useLocation();
  if (isStandalone(pathname)) return null;
  return <Navbar />;
}

function ConditionalFooter() {
  const { pathname } = useLocation();
  if (isStandalone(pathname)) return null;
  return <Footer />;
}

function App() {
  return (
    <BrowserRouter>
      <HtmlLang />
      <LanguageActivator />
      <ScrollToTop />
      <ConditionalNavbar />
      <Routes>
        {/* DE (default, no prefix) */}
        <Route path="/" element={<Home />} />
        <Route path="/infusions" element={<Infusions />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/thema/:slug" element={<BlogTopic />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/edit/:id" element={<BlogEditor />} />
        <Route path="/mein-buch" element={<MeinBuch />} />
        <Route path="/spezielle-therapien" element={<SpezielleTherapien />} />
        <Route path="/therapien/:slug" element={<TherapieDetail />} />
        <Route path="/rechtliches" element={<LegalNotice />} />
        <Route path="/diagnostik" element={<HealthCheck />} />
        <Route path="/ueber-mich" element={<UeberMich />} />
        <Route path="/ketamin" element={<Extras />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/koerperliche-symptome" element={<KoerperlicheSymptome />} />
        <Route path="/praevention-longevity" element={<PraeventionLongevity />} />
        <Route path="/psychotherapie" element={<Psychotherapie />} />
        <Route path="/beratung" element={<Beratung />} />
        <Route path="/mentoring" element={<Mentoring />} />
        <Route path="/kontakt" element={<Kontakt />} />

        {/* Internal: iPad Honorar forms (practice use only, not linked/indexed) */}
        <Route path="/honorar" element={<HonorarHub />} />
        <Route path="/honorar/:slug" element={<HonorarForm />} />

        {/* Patient intake (iPad/phone, served as standalone HTML in iframe) */}
        <Route path="/anamnese" element={<Anamnese />} />

        {/* EN (mirrored, /en prefix) */}
        <Route path="/en" element={<Home />} />
        <Route path="/en/infusions" element={<Infusions />} />
        <Route path="/en/blog" element={<Blog />} />
        <Route path="/en/blog/topic/:slug" element={<BlogTopic />} />
        <Route path="/en/blog/:slug" element={<BlogPost />} />
        <Route path="/en/my-book" element={<MeinBuch />} />
        <Route path="/en/special-therapies" element={<SpezielleTherapien />} />
        <Route path="/en/legal-notice" element={<LegalNotice />} />
        <Route path="/en/diagnostics" element={<HealthCheck />} />
        <Route path="/en/about" element={<UeberMich />} />
        <Route path="/en/ketamine" element={<Extras />} />
        <Route path="/en/experience" element={<Experience />} />
        <Route path="/en/physical-symptoms" element={<KoerperlicheSymptome />} />
        <Route path="/en/prevention-longevity" element={<PraeventionLongevity />} />
        <Route path="/en/psychotherapy" element={<Psychotherapie />} />
        <Route path="/en/consultations" element={<Beratung />} />
        <Route path="/en/mentoring" element={<Mentoring />} />
        <Route path="/en/therapies/:slug" element={<TherapieDetail />} />
        <Route path="/en/contact" element={<Kontakt />} />
      </Routes>
      <ConditionalFooter />
      <ConditionalSwitcher />
    </BrowserRouter>
  );
}

export default App;
