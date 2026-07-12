"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Renders the public site chrome (navbar, footer, language switcher) around
// the page — except on internal tool routes like /admin, which get a bare
// full-height shell so the dashboard isn't pushed down by the tall navbar.
const BARE_PREFIXES = ["/admin", "/companion"];

export default function SiteChrome({ children }) {
  const pathname = usePathname() || "";
  const bare = BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (bare) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <LanguageSwitcher />
    </>
  );
}
