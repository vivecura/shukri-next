import { Plus_Jakarta_Sans, Libre_Baskerville } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import HtmlLang from "@/components/HtmlLang";
import SiteChrome from "@/components/SiteChrome";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-libre-baskerville",
});

const SITE_URL = "https://vivecura.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ViveCura – Funktionelle Medizin, Prävention & Longevity in Berlin",
    template: "%s – ViveCura",
  },
  description:
    "Funktionelle Medizin, Prävention & Longevity in Berlin. Ärztliche Beratung, Diagnostik, Mentoring und gezielte Therapien — ganzheitlich, evidenzbasiert.",
  robots: "index, follow",
  icons: {
    icon: "/Assets/logo6.png",
    apple: "/Assets/logo6.png",
  },
  openGraph: {
    siteName: "ViveCura",
    type: "website",
    locale: "de_DE",
    images: [{ url: "/Assets/logo6.png" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/Assets/logo6.png"],
  },
};

export const viewport = {
  themeColor: "#43a9ab",
  width: "device-width",
  initialScale: 1,
};

// Schema.org: Praxis-Grunddaten für Suchmaschinen & KI-Assistenten (GEO).
// Angaben müssen mit Impressum + Google Business Profile übereinstimmen (NAP-Konsistenz).
const clinicJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  "@id": `${SITE_URL}/#praxis`,
  name: "ViveCura – Praxis für funktionelle Medizin",
  url: SITE_URL,
  logo: `${SITE_URL}/Assets/logo6.png`,
  image: `${SITE_URL}/Assets/logo6.png`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Skalitzer Straße 137",
    postalCode: "10999",
    addressLocality: "Berlin",
    addressCountry: "DE",
  },
  founder: {
    "@type": "Physician",
    name: "Shukri Jarmoukli",
    url: `${SITE_URL}/ueber-mich`,
    sameAs: [
      "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli",
      "https://www.instagram.com/vivecura/",
      "https://www.linkedin.com/in/shukri-jarmoukli/",
    ],
  },
  availableService: [
    { "@type": "MedicalProcedure", name: "Ganzheitliche Diagnostik" },
    { "@type": "MedicalProcedure", name: "Eiseninfusion" },
    { "@type": "MedicalProcedure", name: "Infusionstherapie" },
    { "@type": "MedicalProcedure", name: "Prävention und Longevity-Medizin" },
  ],
  sameAs: [
    "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli",
    "https://www.instagram.com/vivecura/",
    "https://www.linkedin.com/in/shukri-jarmoukli/",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="de"
      className={`${plusJakarta.variable} ${libreBaskerville.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HtmlLang />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd) }}
        />
        <SiteChrome>{children}</SiteChrome>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PVM2RGELWW"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PVM2RGELWW');
            document.addEventListener('click', function (ev) {
              var el = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
              if (!el) return;
              var href = el.href || '';
              if (href.indexOf('doctolib.de') === -1 || href.indexOf('booking') === -1) return;
              gtag('event', 'termin_klick', {
                booking_typ: href.indexOf('booking/new-patient') !== -1 ? 'neupatient'
                  : href.indexOf('booking/motives') !== -1 ? 'profil' : 'sonstige',
                link_url: href,
                transport_type: 'beacon'
              });
            }, true);
          `}
        </Script>
      </body>
    </html>
  );
}
