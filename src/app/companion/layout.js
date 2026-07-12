// src/app/companion/layout.js
//
// Segment-Layout der Patienten-App (ViveCura Companion, Stufe 2).
// Hier hängt die PWA-Metadaten-Schicht: Manifest für den Home-Bildschirm
// (Android/Chrome) + appleWebApp für iOS "Zum Home-Bildschirm" (>= 16.4).
// KEIN Service Worker — Push ist bewusst Stufe 3.

export const metadata = {
  title: "ViveCura Companion",
  robots: "noindex, nofollow",
  manifest: "/companion-manifest.json",
  appleWebApp: {
    capable: true,
    title: "ViveCura Companion",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/Assets/LOGO7.png",
  },
};

// viewport-fit=cover, damit env(safe-area-inset-bottom) der Tab-Bar auf
// iPhones mit Home-Indicator greift (Standalone-Modus).
export const viewport = {
  themeColor: "#43a9ab",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function CompanionLayout({ children }) {
  return children;
}
