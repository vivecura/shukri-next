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

export default function RootLayout({ children }) {
  return (
    <html
      lang="de"
      className={`${plusJakarta.variable} ${libreBaskerville.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HtmlLang />
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
          `}
        </Script>
      </body>
    </html>
  );
}
