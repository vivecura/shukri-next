/* ViveCura Conversion-Tracking: Klicks auf Doctolib-Buchungslinks als
   GA4-Event "termin_klick". Bindet Google Analytics (G-PVM2RGELWW) selbst ein,
   falls die Seite es nicht schon tut (z. B. statische Therapie-Seiten). */
(function () {
  if (window.__terminTrackingInstalled) return;
  window.__terminTrackingInstalled = true;

  var GA_ID = "G-PVM2RGELWW";

  // GA nur nachladen, wenn weder gtag-Funktion noch gtag-Loader vorhanden sind
  var hasLoader = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (typeof window.gtag !== "function" && !hasLoader) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function sendEvent(href) {
    var typ = "sonstige";
    if (href.indexOf("booking/new-patient") !== -1) typ = "neupatient";
    else if (href.indexOf("booking/motives") !== -1) typ = "profil";
    var g = window.gtag || function () { (window.dataLayer = window.dataLayer || []).push(arguments); };
    g("event", "termin_klick", {
      booking_typ: typ,
      link_url: href,
      transport_type: "beacon",
    });
  }

  document.addEventListener(
    "click",
    function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!el) return;
      var href = el.href || "";
      if (href.indexOf("doctolib.de") === -1 || href.indexOf("booking") === -1) return;
      sendEvent(href);
    },
    true
  );
})();
