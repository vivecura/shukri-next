"use client";

/**
 * DiagnostikNew — Neue /diagnostik Seite (Variante B), bilingual DE/EN.
 * Portiert aus dem Prototyp diagnostik-final-B.html.
 * CSS ist unter .vd gekapselt (kein Leaken ins restliche Site-Styling).
 * Nav/Footer kommen global über SiteChrome; Fonts über --font-plus-jakarta / --font-libre-baskerville.
 */

import { useEffect, useRef } from "react";
import useLanguage from "@/hooks/useLanguage";

const BOOK = "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile";
const IMG = "/Assets/Diagnostik2.png";

/* ---------------- Icons (width/height als Attribut) ---------------- */
const svg = (inner) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const IC = {
  heart: svg('<path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z"/>'),
  flame: svg('<path d="M12 12c2-3 0-7-1-8 0 3-1.8 4.7-3 6s-2 3.2-2 5a6 6 0 1 0 12 0c0-1.5-1.1-3.9-2-5-1.8 3-2.8 3-4 2z"/>'),
  bolt: svg('<path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>'),
  moon: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
  bowl: svg('<path d="M3 11h18M4 11a8 8 0 0 0 16 0"/>'),
  apple: svg('<circle cx="12" cy="14" r="6"/><path d="M12 8c0-2 1.5-3.5 3.5-3.5"/>'),
  wind: svg('<path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5M3 12h13a2.5 2.5 0 1 1-2.5 2.5M3 16h7a2 2 0 1 1-2 2"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9.5-4.8-1.2-8-5-8-9.5V6z"/>'),
  dna: svg('<path d="M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9M8 7h8M8 17h8"/>'),
  pulse: svg('<path d="M2 12h4l2.5-7 4.5 15 3-8 2 3h4"/>'),
};
const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const ARROW = '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

/* Fokus-Icons (Anlässe) */
const FI = {
  bowl: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18M4 11a8 8 0 0 0 16 0"/></svg>',
  heart: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z"/></svg>',
  scan: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.5"/></svg>',
  bolt: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>',
  shield: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9.5-4.8-1.2-8-5-8-9.5V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  sparkle: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/></svg>',
};

const magnifier = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
const target = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
const layers = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/></svg>';

/* ---------------- Inhalt DE + EN ---------------- */
const CONTENT = {
  de: {
    hero: {
      eyebrow: "Funktionelle Medizin · Prävention · Longevity · Berlin",
      h1a: "Ihre Gesundheit, in ", h1em: "Tiefe", h1b: " gelesen.",
      sub: "Eine ganzheitliche Analyse, die nicht bei Werten aufhört. Bis zu 120 Marker, ärztlich besprochen, mit einem Plan für Ihren nächsten Schritt.",
      strike: "Bei uns bekommen Sie nie nur Zahlen.",
      plan: "Sie bekommen einen <b>Plan.</b>",
      cta: "Analyse zusammenstellen", ghost: "Nur eine Frage klären",
    },
    afeature: {
      tag: "Das Herzstück", h2a: "Ihre ganzheitliche ", h2em: "Analyse", h2b: ".",
      lead: "In einem einzigen Termin erhalten Sie eine fundierte Diagnostik, ein Gespräch über Ihre Gesundheit und einen Plan, der genau zu Ihrem Körper und Ihrem Leben passt.",
      glance: ["1,5 Stunden ärztliche Analyse mit Shukri Jarmoukli", "Stoffwechsel, Nervensystem und Blut in einem Bild", "Auswertung und individueller Behandlungsplan"],
      cta: "Analyse zusammenstellen",
    },
    why: {
      tag: "Warum ViveCura", h2a: "Keine Fließbandmedizin. ", h2em: "Echte Zuwendung.", h2b: "",
      lead: "Wir verbinden moderne Diagnostik mit ganzheitlicher Betreuung. Kein Schema F, sondern ein Blick, der zusammenpasst.",
      cards: [
        { ic: magnifier, t: "Ursachen statt Symptome", p: "Wir behandeln nicht, was sich zeigt, sondern was dahintersteckt. Unsere Diagnostik geht tiefer als der Standard und kann aufdecken, was klassische Untersuchungen oft übersehen." },
        { ic: target, t: "Präzision statt Raten", p: "Jede Empfehlung basiert auf Ihren individuellen Werten. Kein Schema F, kein Bauchgefühl. Was wir empfehlen, ist messbar begründet." },
        { ic: layers, t: "Ein Bild, das zusammenpasst", p: "Wir betrachten Ihr Blut, Ihren Darm, Ihre Hormone, Mikronährstoffe und Ihren Lebensstil im Zusammenhang, weil Gesundheit kein Einzelbefund ist." },
      ],
    },
    cfg: {
      tag: "Säule A · Ganzheitliche Analyse", h2a: "Stellen Sie Ihre ", h2em: "Tiefe", h2b: " ein.",
      lead: "Ein Honorar, drei Laborstufen. Wählen Sie links Ihre Tiefe, rechts sehen Sie jeden Wert, den wir für Sie bestimmen, offen aufgelistet.",
      honorar: 'Das <b>ärztliche Honorar von 300 Euro</b> für die ganzheitliche Analyse mit Shukri Jarmoukli ist immer enthalten. 1,5 Stunden vor Ort. Dazu wählen Sie eine Laborstufe.',
      hint: "Tippen Sie eine der drei Stufen an, um sie zu wählen",
      popular: "Beliebt", marker: "Marker", von: "von 120", laborLbl: "Labor", honorarLbl: "Honorar", book: "Diese Stufe buchen",
      rightHead: "Was wir für Sie lesen",
      inherit1: "Enthält alles aus Basic, plus die neuen Systeme unten.",
      inherit2: "Enthält alles aus Basic und Allrounder, plus die neuen Systeme unten.",
      newTag: "Neu",
      stages: [
        { name: "Basic", werteLbl: "ca. 40 Werte", labor: 300, total: 600, werte: 40, desc: "Rund 40 Werte, die eine echte Standortbestimmung liefern. Kein Alibi, sondern eine belastbare Grundlage für Ihren Plan." },
        { name: "Allrounder", werteLbl: "ca. 70 Werte", labor: 600, total: 900, werte: 70, desc: "Rund 70 Werte. Alles aus Basic, dazu Hormone, Mineralstoffe, Fettsäuren und Aminosäuren für das größere Bild." },
        { name: "Tiefgang", werteLbl: "ca. 120 Werte", labor: 1200, total: 1500, werte: 120, desc: "Rund 120 Werte. Die tiefste Ebene, inklusive Darm, Mitochondrien, Umweltbelastung und stiller Entzündung. Stuhlanalyse fest enthalten." },
      ],
    },
    methodsSec: {
      tag: "Was in den 300 Euro steckt", h2a: "1,5 Stunden, die ", h2em: "alles", h2b: " zusammenführen.",
      lead: "Ihre Analyse ist mehr als eine Blutabnahme. Wir messen Stoffwechsel, Nervensystem und Nährstoffe, nehmen Blut ab und führen am Ende alles in einem Gespräch zusammen. So entsteht Ihr Plan.",
      pill: "Ergebnis", foot: "Kein Stapel Zahlen, sondern ein konkreter nächster Schritt aus Ernährung, fehlenden Stoffen, Supplementen und Pflanzenheilkunde.",
    },
    focusSec: {
      tag: "Häufige Anlässe", h2a: "Womit Menschen ", h2em: "zu uns kommen", h2b: ".",
      lead: "Jeder Check ist individuell. Diese Themen bringen die meisten mit. Ihr Fokus bestimmt, wo wir genauer hinschauen.",
    },
    bSec: {
      tag: "Säule B · Gezielte Diagnostik",
      h3a: "Sie wollen den kompletten Überblick, oder nur eine ", h3em: "bestimmte Frage", h3b: " beantwortet?",
      p: "Wenn Sie ein konkretes Thema umtreibt, gehen wir gezielt in die Tiefe. Jedes Paket ist ein All-in-Festpreis: Labor plus 30 Minuten Befundbesprechung mit Ihrem Plan. Tippen Sie ein Paket an, um alle Marker zu sehen.",
      allin: "Festpreis inklusive Labor und 30 Minuten Befundbesprechung mit Ihrem persönlichen Plan.",
      book: "Termin buchen",
    },
    mentor: {
      tag: "Mehr als ein Termin", h2a: "Danach lasse ich Sie ", h2em: "nicht allein", h2b: ".",
      p: "Sie bekommen keinen allgemeinen Rat, sondern einen konkreten Plan. Und auf Wunsch ein Mentoring, das Sie langfristig begleitet: Wir passen Ihren Plan an und bleiben an Ihrer Seite, bis Sie wirklich dort ankommen, wo Sie hinwollen.",
    },
    closing: {
      h2a: "Bereit für Ihren ", h2em: "Plan", h2b: "?",
      p: "Buchen Sie Ihre ganzheitliche Analyse mit Shukri Jarmoukli. Wir nehmen uns 1,5 Stunden Zeit und Sie gehen mit einem klaren nächsten Schritt nach Hause.",
      cta: "Termin bei ViveCura buchen", addr: "ViveCura · Skalitzer Straße 137 · 10999 Berlin",
    },
    compliance: "Alle Preise sind Richtwerte und können je nach individuellem Laborumfang abweichen. Die genannten Analysen können Hinweise auf Ihre Gesundheit geben, ersetzen keine ärztliche Diagnose und versprechen keine Heilung. Ob und welche Untersuchungen für Sie sinnvoll sind, klären wir gemeinsam im persönlichen Gespräch.",
    modal: {
      eyebrow: "Kurz vor dem Buchen",
      title: "Welchen Termin möchten Sie wählen?",
      intro: "Gleich sehen Sie bei Doctolib alle Terminarten. Bitte wählen Sie dort einen dieser beiden:",
      opt1t: "Ganzheitliche Analyse (1,5 Std)",
      opt1d: "Wenn Sie den kompletten Überblick möchten — die große Analyse mit Ihrer Laborstufe.",
      opt2t: "Diagnostik-Slot (30 Min)",
      opt2d: "Für eine gezielte Einzel-Anfrage aus diesem Angebot, zum Beispiel Darm, Hormone oder NAD+.",
      go: "Weiter zu Doctolib",
      cancel: "Zurück",
    },
    systems: [
      { min: 0, name: "Großes Blutbild und Differential", benefit: "Zeigt, ob Blutbildung, Abwehr und Entzündungslage im Lot sind.", markers: ["Erythrozyten", "Leukozyten", "Hämoglobin", "Hämatokrit", "Thrombozyten", "MCV", "MCH", "MCHC", "Neutrophile", "Lymphozyten", "Monozyten", "Eosinophile", "Basophile"] },
      { min: 0, name: "Leber, Niere und Stoffwechsel", benefit: "Wie gut Ihre Entgiftungs- und Filterorgane arbeiten.", markers: ["GOT", "GPT", "GGT", "AP", "Bilirubin", "Kreatinin", "eGFR", "Harnstoff", "Harnsäure", "Albumin"] },
      { min: 0, name: "Blutzucker und Insulin", benefit: "Ein früher Blick auf Insulinresistenz, oft Jahre vor der Diagnose.", markers: ["Glukose", "HbA1c", "Insulin", "HOMA-Index"] },
      { min: 0, name: "Herz und Fettstoffwechsel", benefit: "Ihr echtes Herz-Kreislauf-Risiko, genauer als reines Cholesterin.", markers: ["Cholesterin", "HDL", "LDL", "Triglyceride", "Lipoprotein(a)", "ApoB", "Homocystein"] },
      { min: 0, name: "Eisen", benefit: "Eine häufige, oft übersehene Ursache von Müdigkeit und Haarausfall.", markers: ["Ferritin", "Transferrin"] },
      { min: 0, name: "Schilddrüse", benefit: "Der Taktgeber für Energie, Gewicht und Stimmung.", markers: ["TSH", "fT3", "fT4"] },
      { min: 0, name: "Vitamine und Entzündung", benefit: "Bausteine für Nerven, Knochen und Immunsystem.", markers: ["Vitamin D3", "Vitamin B12", "Folsäure", "CRP"] },
      { min: 1, name: "Sexualhormone", benefit: "Was hinter Zyklus, Libido, Antrieb und Stimmung stecken kann.", markers: ["Östradiol", "Progesteron", "freies Testosteron", "DHEAS"] },
      { min: 1, name: "Stress und Cortisol", benefit: "Wie Ihr Körper mit Dauerstress umgeht.", markers: ["Cortisol", "DHEA"] },
      { min: 1, name: "Mineralstoffe und Spurenelemente", benefit: "Die Zünder für Hunderte Enzyme, im Vollblut zuverlässiger gemessen.", markers: ["Magnesium", "Selen", "Zink", "Calcium", "Kupfer", "Mangan", "Chrom", "Molybdän", "Phosphor"] },
      { min: 1, name: "Omega-3-Index", benefit: "Ihr Entzündungs- und Zellschutz-Status über die Fettsäuren.", markers: ["EPA", "DHA", "AA/EPA-Ratio"] },
      { min: 1, name: "Aminosäureprofil", benefit: "Die Bausteine für Muskeln, Botenstoffe und Regeneration.", markers: ["BCAA", "Glutamin", "Taurin", "Tyrosin", "Arginin"] },
      { min: 2, name: "Mitochondrien und Energie", benefit: "Die Kraftwerke Ihrer Zellen, die Basis jeder Energie.", markers: ["ATP intrazellulär", "Coenzym Q10", "Laktat/Pyruvat"] },
      { min: 2, name: "Tiefe Entzündung und oxidativer Stress", benefit: "Stille Entzündung, die man im Standardlabor nicht sieht.", markers: ["TNF-alpha", "TGF-beta", "Nitrotyrosin", "Lipidperoxide", "Coeruloplasmin"] },
      { min: 2, name: "Histamin und DAO", benefit: "Bei Unverträglichkeiten, Migräne und Hautreaktionen.", markers: ["Histamin", "DAO"] },
      { min: 2, name: "Bioaktive B-Vitamine", benefit: "Ob Ihre Zellen die Vitamine wirklich verwerten.", markers: ["Vitamin B1", "Vitamin B2", "Vitamin B6"] },
      { min: 2, name: "Toxische Metalle im Vollblut", benefit: "Belastung durch Blei, Quecksilber, Cadmium und Co.", markers: ["Blei", "Quecksilber", "Cadmium", "Aluminium", "Arsen", "Nickel"] },
      { min: 2, name: "Schimmel und Mykotoxine im Urin", benefit: "Umweltbelastung als mögliche Ursache von Brain Fog und Erschöpfung.", markers: ["Ochratoxin A", "Aflatoxin", "Gliotoxin", "Zearalenon"] },
      { min: 2, name: "Darm komplett aus dem Stuhl", benefit: "Die Wurzel vieler Beschwerden, von Haut bis Stimmung.", markers: ["Mikrobiom", "Parasiten-PCR", "Zonulin (Leaky Gut)", "sIgA", "Pankreaselastase", "Gallensäuren", "Calprotectin"] },
    ],
    methods: [
      { step: "01", name: "Stoffwechsel-Analyse", sub: "BIA", text: "Körperzusammensetzung, Muskel, Wasser und Zellgesundheit als messbarer Ausgangspunkt." },
      { step: "02", name: "Nervensystem", sub: "HRV", text: "Die Herzratenvariabilität zeigt, wie Ihr vegetatives Nervensystem mit Belastung umgeht." },
      { step: "03", name: "Nährstoff-Scan", sub: "", text: "Ein schneller Blick auf mögliche Defizite, noch bevor der Laborbefund vorliegt." },
      { step: "04", name: "Blutentnahme", sub: "", text: "Ihre gewählte Laborstufe, direkt bei uns vor Ort abgenommen." },
      { step: "05", name: "Auswertung und Plan", sub: "", text: "Gemeinsame Besprechung und ein konkreter Plan für Ihren nächsten Schritt." },
    ],
    focus: [
      { ic: FI.bowl, t: "Darm & Verdauung", items: ["Mikrobiom-Analyse", "Nahrungsmittelunverträglichkeiten", "Darm-Reset-Programm"] },
      { ic: FI.heart, t: "Psyche & Nervensystem", items: ["Stress- & Schlafanalyse", "Regulation des Nervensystems", "Ganzheitliche Begleitung"] },
      { ic: FI.scan, t: "Stoffwechsel & Hormone", items: ["Hormon-Diagnostik", "Schilddrüsen- & Geschlechtshormone", "Individuelles Balance-Konzept"] },
      { ic: FI.bolt, t: "Leistung & Energie", items: ["Mitochondrien-Check", "Mikronährstoff-Status", "Energie- & Regenerationsplan"] },
      { ic: FI.shield, t: "Immunsystem & Infekte", items: ["Immun-Profil", "Chronische Infekte & Toxine", "Stärkung der Abwehr"] },
      { ic: FI.sparkle, t: "Prävention & Longevity", items: ["Früherkennungs-Check", "Risikofaktor-Analyse", "Langzeit-Gesundheitsplan"] },
    ],
    packages: [
      { name: "Hormone", price: "ca. 300 €", icon: IC.heart, forwho: "Für Zyklus, Wechseljahre, Libido, Antrieb und Stimmung.", benefit: "Was hinter Zyklus, Libido, Antrieb und Stimmung stecken kann, im Zusammenspiel statt einzeln betrachtet.", markers: ["Sexualhormone", "Östradiol", "Progesteron", "Testosteron", "DHEAS", "Schilddrüse (TSH, fT3, fT4)", "Cortisol", "Vitamin D"] },
      { name: "Burnout und Stress", price: "ca. 580 €", icon: IC.flame, forwho: "Bei Dauerstress, Erschöpfung, innerer Unruhe und dem Gefühl, ausgebrannt zu sein.", benefit: "Wie Ihre Stress-Achse und Ihre Erholung wirklich stehen. Die Alpha-Amylase bildet dabei das Gleichgewicht von Anspannung und Entspannung ab, ganz ohne Belastungstest.", markers: ["Cortisol-Tagesprofil", "Alpha-Amylase", "Pregnenolonsulfat", "Rezeptor-Aktivität (GRAKT)", "GDF-15", "BDNF", "ATP intrazellulär", "MDA-LDL", "Nitrotyrosin", "IP-10"] },
      { name: "Mitochondrien und Energie", price: "ca. 340 €", icon: IC.bolt, forwho: "Bei anhaltender Erschöpfung, Leistungsknick und nach durchgemachten Infekten.", benefit: "Ein Blick auf die Kraftwerke Ihrer Zellen. Der Laktat-Pyruvat-Quotient zeigt, ob die Energiegewinnung ins Stocken gerät.", markers: ["ATP intrazellulär", "NAD+/NADH", "GDF-15", "IL-6", "TNF-alpha", "Laktat/Pyruvat"] },
      { name: "NAD+ Testung", price: "ca. 190 €", icon: IC.pulse, forwho: "Vor einer NAD+-Infusion oder aus Longevity-Gründen: wenn Sie Ihren NAD+-Wert kennen möchten.", benefit: "NAD+ ist ein zentraler Baustein für Zellenergie und Regeneration. Wir bestimmen Ihren Ausgangswert, bevor Sie eine Infusion erwägen, oder einfach, um Ihren Status zu kennen.", markers: ["NAD+ / NADH (Blut)", "Zellenergie-Status"] },
      { name: "Schlaf-Diagnostik", price: "ca. 270 €", icon: IC.moon, forwho: "Bei Einschlaf- und Durchschlafstörungen.", benefit: "Warum Sie nicht ein- oder durchschlafen, gemessen im Tag-Nacht-Verlauf und ergänzt um eine HRV-Messung mit EKG bei uns in der Praxis.", markers: ["Schlafprofil Bettzeit (Einschlafen)", "Schlafprofil 2 Uhr nachts (Durchschlafen)", "Melatonin", "Cortisol", "Alpha-Amylase", "HRV mit EKG (in der Praxis)"] },
      { name: "Darm", price: "ca. 400 €", icon: IC.bowl, forwho: "Bei Blähungen, Reizdarm, Unverträglichkeiten und Hautthemen.", benefit: "Die Wurzel vieler Beschwerden, von Haut bis Stimmung, aus einer umfassenden Stuhlanalyse.", markers: ["Mikrobiom", "Parasiten-PCR", "Zonulin (Leaky Gut)", "sIgA", "Pankreaselastase", "Gallensäuren", "Calprotectin"] },
      { name: "Nahrungsmittel-Unverträglichkeit", price: "ca. 330 €", icon: IC.apple, forwho: "Bei Blähungen, Hautthemen und Reaktionen nach dem Essen.", benefit: "Welche Lebensmittel Ihr Immunsystem beschäftigen, über einen LTT-Test auf 25 häufige Nahrungsmittel.", markers: ["LTT-Test", "25 häufige Nahrungsmittel"] },
      { name: "Schimmel", price: "ca. 240 €", icon: IC.wind, forwho: "Bei Brain Fog, Erschöpfung und Verdacht auf Umweltbelastung.", benefit: "Umweltbelastung als mögliche Ursache von Brain Fog und Erschöpfung, über Mykotoxine im Urin.", markers: ["Mykotoxine im Urin", "Ochratoxin A", "Aflatoxin", "Gliotoxin", "Zearalenon"] },
      { name: "Schwermetalle", price: "ca. 390 €", icon: IC.shield, forwho: "Bei Amalgam, Altbau und unklarer Erschöpfung.", benefit: "Belastung durch Blei, Quecksilber und Co. sichtbar gemacht, samt Ausleitungskonzept.", markers: ["Provokations-Infusion", "Blei", "Quecksilber", "Cadmium", "Aluminium", "Arsen", "Nickel"] },
      { name: "Genetik & Epigenetik", price: "ca. 600 €", icon: IC.dna, forwho: "Wenn Sie wissen wollen, wo Ihre Anlagen liegen und wie Ihr Lebensstil sie beeinflusst.", benefit: "Ihre Gene zeigen das Potenzial, Ihr Lebensstil entscheidet über die Umsetzung. Für Strategien, die wirklich zu Ihnen passen.", markers: ["Komplette Genom-Analyse", "Genetische Veranlagung", "Epigenetik", "Personalisierte Strategie"] },
    ],
  },

  en: {
    hero: {
      eyebrow: "Functional Medicine · Prevention · Longevity · Berlin",
      h1a: "Your health, read in ", h1em: "depth", h1b: ".",
      sub: "A holistic analysis that does not stop at numbers. Up to 120 markers, discussed with a physician, with a plan for your next step.",
      strike: "With us you never get just numbers.",
      plan: "You get a <b>plan.</b>",
      cta: "Build your analysis", ghost: "Just one question",
    },
    afeature: {
      tag: "The heart of it", h2a: "Your holistic ", h2em: "analysis", h2b: ".",
      lead: "In a single appointment you receive a thorough diagnostic work-up, a conversation about your health and a plan that fits your body and your life.",
      glance: ["1.5 hours of medical analysis with Shukri Jarmoukli", "Metabolism, nervous system and blood in one picture", "Evaluation and an individual treatment plan"],
      cta: "Build your analysis",
    },
    why: {
      tag: "Why ViveCura", h2a: "No conveyor-belt medicine. ", h2em: "Real care.", h2b: "",
      lead: "We combine modern diagnostics with holistic support. No one-size-fits-all, but a picture that fits together.",
      cards: [
        { ic: magnifier, t: "Causes, not symptoms", p: "We do not treat what shows on the surface, but what lies beneath. Our diagnostics go deeper than the standard and can reveal what conventional check-ups often miss." },
        { ic: target, t: "Precision, not guessing", p: "Every recommendation is based on your individual values. No template, no gut feeling. What we recommend is measurably justified." },
        { ic: layers, t: "A picture that fits together", p: "We look at your blood, your gut, your hormones, micronutrients and your lifestyle in context, because health is never a single finding." },
      ],
    },
    cfg: {
      tag: "Pillar A · Holistic Analysis", h2a: "Set your ", h2em: "depth", h2b: ".",
      lead: "One physician's fee, three lab levels. Choose your depth on the left; on the right you see every value we measure, openly listed.",
      honorar: 'The <b>physician’s fee of 300 euros</b> for the holistic analysis with Shukri Jarmoukli is always included. 1.5 hours on site. On top you choose a lab level.',
      hint: "Tap one of the three levels to choose it",
      popular: "Popular", marker: "Markers", von: "of 120", laborLbl: "Lab", honorarLbl: "Fee", book: "Book this level",
      rightHead: "What we read for you",
      inherit1: "Includes everything from Basic, plus the new systems below.",
      inherit2: "Includes everything from Basic and Allrounder, plus the new systems below.",
      newTag: "New",
      stages: [
        { name: "Basic", werteLbl: "approx. 40 values", labor: 300, total: 600, werte: 40, desc: "Around 40 values that give a real baseline. Not a token check, but a solid foundation for your plan." },
        { name: "Allrounder", werteLbl: "approx. 70 values", labor: 600, total: 900, werte: 70, desc: "Around 70 values. Everything from Basic, plus hormones, minerals, fatty acids and amino acids for the bigger picture." },
        { name: "Tiefgang", werteLbl: "approx. 120 values", labor: 1200, total: 1500, werte: 120, desc: "Around 120 values. The deepest level, including gut, mitochondria, environmental load and silent inflammation. Stool analysis firmly included." },
      ],
    },
    methodsSec: {
      tag: "What is inside the 300 euros", h2a: "1.5 hours that bring ", h2em: "everything", h2b: " together.",
      lead: "Your analysis is more than a blood draw. We measure metabolism, nervous system and nutrients, take blood and bring it all together in one conversation. That is how your plan is created.",
      pill: "Result", foot: "Not a pile of numbers, but a concrete next step from nutrition, missing substances, supplements and herbal medicine.",
    },
    focusSec: {
      tag: "Common reasons", h2a: "What brings people ", h2em: "to us", h2b: ".",
      lead: "Every check is individual. These are the themes most people bring. Your focus decides where we look more closely.",
    },
    bSec: {
      tag: "Pillar B · Targeted Diagnostics",
      h3a: "Do you want the complete overview, or just ", h3em: "one specific question", h3b: " answered?",
      p: "If a specific topic is on your mind, we go deep in a targeted way. Every package is an all-in fixed price: lab plus a 30-minute results consultation with your plan. Tap a package to see all markers.",
      allin: "Fixed price including lab and a 30-minute results consultation with your personal plan.",
      book: "Book appointment",
    },
    mentor: {
      tag: "More than an appointment", h2a: "Afterwards, I do not leave you ", h2em: "on your own", h2b: ".",
      p: "You do not get general advice, but a concrete plan. And, if you wish, mentoring that supports you long term: we adjust your plan and stay by your side until you truly arrive where you want to be.",
    },
    closing: {
      h2a: "Ready for your ", h2em: "plan", h2b: "?",
      p: "Book your holistic analysis with Shukri Jarmoukli. We take 1.5 hours and you leave with a clear next step.",
      cta: "Book an appointment at ViveCura", addr: "ViveCura · Skalitzer Straße 137 · 10999 Berlin",
    },
    compliance: "All prices are guide values and may vary depending on the individual lab scope. The analyses described can provide indications about your health, do not replace a medical diagnosis and do not promise a cure. Whether and which examinations make sense for you is something we clarify together in a personal conversation.",
    modal: {
      eyebrow: "Just before booking",
      title: "Which appointment would you like?",
      intro: "In a moment you will see all appointment types on Doctolib. Please choose one of these two there:",
      opt1t: "Holistic Analysis (1.5 h)",
      opt1d: "If you want the complete overview — the large analysis with your lab level.",
      opt2t: "Diagnostics Slot (30 min)",
      opt2d: "For a single targeted request from this offer, for example gut, hormones or NAD+.",
      go: "Continue to Doctolib",
      cancel: "Back",
    },
    systems: [
      { min: 0, name: "Complete blood count and differential", benefit: "Shows whether blood formation, defence and inflammation are in balance.", markers: ["Erythrocytes", "Leukocytes", "Haemoglobin", "Haematocrit", "Platelets", "MCV", "MCH", "MCHC", "Neutrophils", "Lymphocytes", "Monocytes", "Eosinophils", "Basophils"] },
      { min: 0, name: "Liver, kidney and metabolism", benefit: "How well your detox and filter organs are working.", markers: ["AST", "ALT", "GGT", "ALP", "Bilirubin", "Creatinine", "eGFR", "Urea", "Uric acid", "Albumin"] },
      { min: 0, name: "Blood sugar and insulin", benefit: "An early look at insulin resistance, often years before diagnosis.", markers: ["Glucose", "HbA1c", "Insulin", "HOMA index"] },
      { min: 0, name: "Heart and lipid metabolism", benefit: "Your real cardiovascular risk, more precise than cholesterol alone.", markers: ["Cholesterol", "HDL", "LDL", "Triglycerides", "Lipoprotein(a)", "ApoB", "Homocysteine"] },
      { min: 0, name: "Iron", benefit: "A common, often overlooked cause of fatigue and hair loss.", markers: ["Ferritin", "Transferrin"] },
      { min: 0, name: "Thyroid", benefit: "The pacemaker for energy, weight and mood.", markers: ["TSH", "fT3", "fT4"] },
      { min: 0, name: "Vitamins and inflammation", benefit: "Building blocks for nerves, bones and the immune system.", markers: ["Vitamin D3", "Vitamin B12", "Folate", "CRP"] },
      { min: 1, name: "Sex hormones", benefit: "What can lie behind cycle, libido, drive and mood.", markers: ["Estradiol", "Progesterone", "Free testosterone", "DHEAS"] },
      { min: 1, name: "Stress and cortisol", benefit: "How your body copes with chronic stress.", markers: ["Cortisol", "DHEA"] },
      { min: 1, name: "Minerals and trace elements", benefit: "The spark for hundreds of enzymes, measured more reliably in whole blood.", markers: ["Magnesium", "Selenium", "Zinc", "Calcium", "Copper", "Manganese", "Chromium", "Molybdenum", "Phosphorus"] },
      { min: 1, name: "Omega-3 index", benefit: "Your inflammation and cell-protection status via fatty acids.", markers: ["EPA", "DHA", "AA/EPA ratio"] },
      { min: 1, name: "Amino acid profile", benefit: "The building blocks for muscles, messengers and regeneration.", markers: ["BCAA", "Glutamine", "Taurine", "Tyrosine", "Arginine"] },
      { min: 2, name: "Mitochondria and energy", benefit: "The power plants of your cells, the basis of all energy.", markers: ["ATP intracellular", "Coenzyme Q10", "Lactate/Pyruvate"] },
      { min: 2, name: "Deep inflammation and oxidative stress", benefit: "Silent inflammation that standard labs do not see.", markers: ["TNF-alpha", "TGF-beta", "Nitrotyrosine", "Lipid peroxides", "Ceruloplasmin"] },
      { min: 2, name: "Histamine and DAO", benefit: "For intolerances, migraine and skin reactions.", markers: ["Histamine", "DAO"] },
      { min: 2, name: "Bioactive B vitamins", benefit: "Whether your cells really use the vitamins.", markers: ["Vitamin B1", "Vitamin B2", "Vitamin B6"] },
      { min: 2, name: "Toxic metals in whole blood", benefit: "Exposure to lead, mercury, cadmium and more.", markers: ["Lead", "Mercury", "Cadmium", "Aluminium", "Arsenic", "Nickel"] },
      { min: 2, name: "Mould and mycotoxins in urine", benefit: "Environmental load as a possible cause of brain fog and exhaustion.", markers: ["Ochratoxin A", "Aflatoxin", "Gliotoxin", "Zearalenone"] },
      { min: 2, name: "Complete gut from stool", benefit: "The root of many complaints, from skin to mood.", markers: ["Microbiome", "Parasite PCR", "Zonulin (leaky gut)", "sIgA", "Pancreatic elastase", "Bile acids", "Calprotectin"] },
    ],
    methods: [
      { step: "01", name: "Metabolism analysis", sub: "BIA", text: "Body composition, muscle, water and cell health as a measurable starting point." },
      { step: "02", name: "Nervous system", sub: "HRV", text: "Heart rate variability shows how your autonomic nervous system copes with strain." },
      { step: "03", name: "Nutrient scan", sub: "", text: "A quick look at possible deficits, even before the lab results are in." },
      { step: "04", name: "Blood draw", sub: "", text: "Your chosen lab level, taken directly on site with us." },
      { step: "05", name: "Evaluation and plan", sub: "", text: "A joint discussion and a concrete plan for your next step." },
    ],
    focus: [
      { ic: FI.bowl, t: "Gut & digestion", items: ["Microbiome analysis", "Food intolerances", "Gut reset programme"] },
      { ic: FI.heart, t: "Mind & nervous system", items: ["Stress & sleep analysis", "Nervous system regulation", "Holistic support"] },
      { ic: FI.scan, t: "Metabolism & hormones", items: ["Hormone diagnostics", "Thyroid & sex hormones", "Individual balance concept"] },
      { ic: FI.bolt, t: "Performance & energy", items: ["Mitochondria check", "Micronutrient status", "Energy & recovery plan"] },
      { ic: FI.shield, t: "Immune system & infections", items: ["Immune profile", "Chronic infections & toxins", "Strengthening defences"] },
      { ic: FI.sparkle, t: "Prevention & longevity", items: ["Early detection check", "Risk factor analysis", "Long-term health plan"] },
    ],
    packages: [
      { name: "Hormones", price: "approx. 300 €", icon: IC.heart, forwho: "For cycle, menopause, libido, drive and mood.", benefit: "What can lie behind cycle, libido, drive and mood, seen together rather than in isolation.", markers: ["Sex hormones", "Estradiol", "Progesterone", "Testosterone", "DHEAS", "Thyroid (TSH, fT3, fT4)", "Cortisol", "Vitamin D"] },
      { name: "Burnout and stress", price: "approx. 580 €", icon: IC.flame, forwho: "For chronic stress, exhaustion, inner restlessness and feeling burned out.", benefit: "Where your stress axis and your recovery really stand. Alpha-amylase reflects the balance of tension and relaxation, with no exertion test.", markers: ["Cortisol daily profile", "Alpha-amylase", "Pregnenolone sulfate", "Receptor activity (GRAKT)", "GDF-15", "BDNF", "ATP intracellular", "MDA-LDL", "Nitrotyrosine", "IP-10"] },
      { name: "Mitochondria and energy", price: "approx. 340 €", icon: IC.bolt, forwho: "For persistent exhaustion, a drop in performance and after infections.", benefit: "A look at the power plants of your cells. The lactate-pyruvate ratio shows whether energy production is faltering.", markers: ["ATP intracellular", "NAD+/NADH", "GDF-15", "IL-6", "TNF-alpha", "Lactate/Pyruvate"] },
      { name: "NAD+ testing", price: "approx. 190 €", icon: IC.pulse, forwho: "Before a NAD+ infusion or for longevity reasons: if you want to know your NAD+ level.", benefit: "NAD+ is a central building block for cell energy and regeneration. We measure your baseline before you consider an infusion, or simply to know your status.", markers: ["NAD+ / NADH (blood)", "Cell energy status"] },
      { name: "Sleep diagnostics", price: "approx. 270 €", icon: IC.moon, forwho: "For trouble falling asleep and staying asleep.", benefit: "Why you cannot fall or stay asleep, measured across the day-night cycle and complemented by an HRV measurement with ECG at our practice.", markers: ["Sleep profile bedtime (falling asleep)", "Sleep profile 2 a.m. (staying asleep)", "Melatonin", "Cortisol", "Alpha-amylase", "HRV with ECG (at the practice)"] },
      { name: "Gut", price: "approx. 400 €", icon: IC.bowl, forwho: "For bloating, irritable bowel, intolerances and skin issues.", benefit: "The root of many complaints, from skin to mood, from a comprehensive stool analysis.", markers: ["Microbiome", "Parasite PCR", "Zonulin (leaky gut)", "sIgA", "Pancreatic elastase", "Bile acids", "Calprotectin"] },
      { name: "Food intolerance", price: "approx. 330 €", icon: IC.apple, forwho: "For bloating, skin issues and reactions after eating.", benefit: "Which foods keep your immune system busy, via an LTT test on 25 common foods.", markers: ["LTT test", "25 common foods"] },
      { name: "Mould", price: "approx. 240 €", icon: IC.wind, forwho: "For brain fog, exhaustion and suspected environmental load.", benefit: "Environmental load as a possible cause of brain fog and exhaustion, via mycotoxins in urine.", markers: ["Mycotoxins in urine", "Ochratoxin A", "Aflatoxin", "Gliotoxin", "Zearalenone"] },
      { name: "Heavy metals", price: "approx. 390 €", icon: IC.shield, forwho: "For amalgam, old buildings and unexplained exhaustion.", benefit: "Exposure to lead, mercury and more made visible, together with a detox concept.", markers: ["Provocation infusion", "Lead", "Mercury", "Cadmium", "Aluminium", "Arsenic", "Nickel"] },
      { name: "Genetics & epigenetics", price: "approx. 600 €", icon: IC.dna, forwho: "If you want to know where your predispositions lie and how your lifestyle influences them.", benefit: "Your genes show the potential, your lifestyle decides the outcome. For strategies that truly fit you.", markers: ["Complete genome analysis", "Genetic predisposition", "Epigenetics", "Personalised strategy"] },
    ],
  },
};

/* ---------------- HTML-Aufbau (server-gerendert) ---------------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const CIRC = 395.84;

function buildBody(c) {
  const st = c.cfg.stages;
  // Systeme: ALLE vorrendern, per data-min ein-/ausblenden
  let sysHtml = "", n = 0;
  c.systems.forEach((sy) => {
    const visible = sy.min <= 0;
    if (visible) n++;
    const num = visible ? (n < 10 ? "0" + n : "" + n) : "";
    const chips = sy.markers.map((m) => `<span class="mk">${esc(m)}</span>`).join("");
    const open = n === 1 && visible ? " open" : "";
    sysHtml +=
      `<div class="sys${open}" data-min="${sy.min}" style="${visible ? "" : "display:none"}">` +
        `<div class="sys-head">` +
          `<span class="sys-num">${num}</span>` +
          `<span class="sys-name">${esc(sy.name)}</span>` +
          `<span class="sys-tag" style="display:none">${esc(c.cfg.newTag)}</span>` +
          `<span class="sys-count">${sy.markers.length}</span>` +
          `<span class="sys-chev">${CHEV}</span>` +
        `</div>` +
        `<div class="sys-body"><div class="sys-body-in">` +
          `<div class="sys-benefit">${esc(sy.benefit)}</div>` +
          `<div class="mkrow">${chips}</div>` +
        `</div></div>` +
      `</div>`;
  });

  const methodsHtml = c.methods
    .map(
      (m) =>
        `<div class="mcard"><div class="step">${m.step}</div><h4>${esc(m.name)}</h4>` +
        (m.sub ? `<div class="sub">${esc(m.sub)}</div>` : "") +
        `<p>${esc(m.text)}</p></div>`
    )
    .join("");

  const focusHtml = c.focus
    .map(
      (f) =>
        `<div class="fcard"><div class="ic">${f.ic}</div><h4>${esc(f.t)}</h4><ul>` +
        f.items.map((it) => `<li>${esc(it)}</li>`).join("") +
        `</ul></div>`
    )
    .join("");

  const pkgHtml = c.packages
    .map((p, i) => {
      const chips = p.markers.map((m) => `<span class="mk">${esc(m)}</span>`).join("");
      return (
        `<div class="pkg${i === 0 ? " open" : ""}">` +
          `<div class="pkg-head">` +
            `<span class="pkg-ic">${p.icon}</span>` +
            `<div class="pkg-ti"><h4>${esc(p.name)}</h4><div class="pkg-for">${esc(p.forwho)}</div></div>` +
            `<div class="pkg-price">${esc(p.price)}</div>` +
            `<span class="pkg-chev">${CHEV}</span>` +
          `</div>` +
          `<div class="pkg-body"><div class="pkg-body-in">` +
            `<div class="pkg-benefit">${esc(p.benefit)}</div>` +
            `<div class="mkrow">${chips}</div>` +
            `<div class="pkg-allin">${esc(c.bSec.allin)}</div>` +
            `<a class="pkg-book" href="${BOOK}" rel="noreferrer">${esc(c.bSec.book)} ${ARROW}</a>` +
          `</div></div>` +
        `</div>`
      );
    })
    .join("");

  const whyHtml = c.why.cards
    .map(
      (w) =>
        `<div class="whyc"><div class="ic">${w.ic}</div><h4>${esc(w.t)}</h4><p>${esc(w.p)}</p></div>`
    )
    .join("");

  const glanceHtml = c.afeature.glance.map((g) => `<li>${CHECK}${esc(g)}</li>`).join("");
  const s0 = st[0];

  return `
  <header class="hero">
    <div class="wrap">
      <span class="eyebrow"><span class="dot"></span>${esc(c.hero.eyebrow)}</span>
      <h1 class="hero-h">${esc(c.hero.h1a)}<em>${esc(c.hero.h1em)}</em>${esc(c.hero.h1b)}</h1>
      <p class="hero-sub">${esc(c.hero.sub)}</p>
      <div class="usp-band">
        <div class="usp-strike">${esc(c.hero.strike)}</div>
        <div class="usp-plan">${c.hero.plan}</div>
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#konfigurator">${esc(c.hero.cta)} ${ARROW}</a>
        <a class="btn btn-ghost" href="#saeule-b">${esc(c.hero.ghost)}</a>
      </div>
    </div>
  </header>

  <section class="sec afeature-sec">
    <div class="wrap">
      <div class="afeature">
        <div class="afeature-media"><img src="${IMG}" alt="${esc(c.afeature.h2a + c.afeature.h2em)}" loading="lazy"></div>
        <div class="afeature-content">
          <span class="sec-tag">${esc(c.afeature.tag)}</span>
          <h2 class="sec-h">${esc(c.afeature.h2a)}<em>${esc(c.afeature.h2em)}</em>${esc(c.afeature.h2b)}</h2>
          <p class="sec-lead">${esc(c.afeature.lead)}</p>
          <ul class="aglance">${glanceHtml}</ul>
          <a class="btn btn-primary" href="#konfigurator" style="margin-top:26px">${esc(c.afeature.cta)} ${ARROW}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="sec why">
    <div class="wrap">
      <span class="sec-tag">${esc(c.why.tag)}</span>
      <h2 class="sec-h">${esc(c.why.h2a)}<em>${esc(c.why.h2em)}</em>${esc(c.why.h2b)}</h2>
      <p class="sec-lead">${esc(c.why.lead)}</p>
      <div class="whygrid">${whyHtml}</div>
    </div>
  </section>

  <section class="sec cfg" id="konfigurator">
    <div class="wrap">
      <span class="sec-tag">${esc(c.cfg.tag)}</span>
      <h2 class="sec-h">${esc(c.cfg.h2a)}<em>${esc(c.cfg.h2em)}</em>${esc(c.cfg.h2b)}</h2>
      <p class="sec-lead">${esc(c.cfg.lead)}</p>
      <div class="cfg-shell">
        <div class="cfg-grid">
          <div class="cfg-left">
            <div class="honorar-note">
              <span class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 1.5"/></svg></span>
              <span>${c.cfg.honorar}</span>
            </div>
            <div class="seg-hint"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l7 17 2-6 6-2z"/></svg>${esc(c.cfg.hint)}</div>
            <div class="seg" id="seg">
              <div class="seg-thumb" id="segThumb"></div>
              <button data-idx="0" class="act">${esc(st[0].name)}<small>${esc(st[0].werteLbl)}</small></button>
              <button data-idx="1">${esc(st[1].name)}<small>${esc(st[1].werteLbl)}</small><span class="pop-tag">${esc(c.cfg.popular)}</span></button>
              <button data-idx="2">${esc(st[2].name)}<small>${esc(st[2].werteLbl)}</small></button>
            </div>
            <div class="price-block">
              <div class="arc-wrap">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <defs><linearGradient id="arcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43a9ab"/><stop offset="1" stop-color="#1f6e70"/></linearGradient></defs>
                  <circle cx="75" cy="75" r="63" fill="none" stroke="#e2eeee" stroke-width="9"/>
                  <circle id="arc" cx="75" cy="75" r="63" fill="none" stroke="url(#arcg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${(CIRC * (1 - s0.werte / 120)).toFixed(2)}"/>
                </svg>
                <div class="arc-center">
                  <div class="vals">${esc(c.cfg.marker)}</div>
                  <div class="valn" id="werteNum">${s0.werte}</div>
                  <div class="vall">${esc(c.cfg.von)}</div>
                </div>
              </div>
              <div class="price-detail">
                <div class="price-tier" id="tierLabel">${esc(s0.name)}</div>
                <div class="price-big"><span id="totalNum">${s0.total}</span><span class="eur">€</span></div>
                <div class="price-break"><b id="laborNum">${s0.labor}</b> € ${esc(c.cfg.laborLbl)} <span style="color:var(--gray-soft)">+</span> <b>300</b> € ${esc(c.cfg.honorarLbl)}</div>
              </div>
            </div>
            <p class="tier-desc" id="tierDesc">${esc(s0.desc)}</p>
            <a class="btn btn-primary cfg-book" href="${BOOK}" rel="noreferrer">${esc(c.cfg.book)} ${ARROW}</a>
          </div>
          <div class="cfg-right">
            <div class="right-head">${esc(c.cfg.rightHead)}</div>
            <div class="inherit" id="inherit"><span class="ck">✓</span><span id="inheritText"></span></div>
            <div class="sysblocks" id="sysblocks">${sysHtml}</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec methods">
    <div class="wrap">
      <span class="sec-tag">${esc(c.methodsSec.tag)}</span>
      <h2 class="sec-h">${esc(c.methodsSec.h2a)}<em>${esc(c.methodsSec.h2em)}</em>${esc(c.methodsSec.h2b)}</h2>
      <p class="sec-lead">${esc(c.methodsSec.lead)}</p>
      <div class="mgrid">${methodsHtml}</div>
      <div class="mfoot"><span class="pill">${esc(c.methodsSec.pill)}</span><span>${esc(c.methodsSec.foot)}</span></div>
    </div>
  </section>

  <section class="sec focus">
    <div class="wrap">
      <span class="sec-tag">${esc(c.focusSec.tag)}</span>
      <h2 class="sec-h">${esc(c.focusSec.h2a)}<em>${esc(c.focusSec.h2em)}</em>${esc(c.focusSec.h2b)}</h2>
      <p class="sec-lead">${esc(c.focusSec.lead)}</p>
      <div class="fgrid">${focusHtml}</div>
    </div>
  </section>

  <section class="sec saeuleb" id="saeule-b">
    <div class="wrap">
      <div class="trenn">
        <span class="tt">${esc(c.bSec.tag)}</span>
        <h3>${esc(c.bSec.h3a)}<em>${esc(c.bSec.h3em)}</em>${esc(c.bSec.h3b)}</h3>
        <p>${esc(c.bSec.p)}</p>
      </div>
      <div class="pkg-grid" id="pkgGrid">${pkgHtml}</div>
    </div>
  </section>

  <section class="sec mentor">
    <div class="wrap">
      <div class="mentor-in">
        <span class="tt">${esc(c.mentor.tag)}</span>
        <h2>${esc(c.mentor.h2a)}<em>${esc(c.mentor.h2em)}</em>${esc(c.mentor.h2b)}</h2>
        <p>${esc(c.mentor.p)}</p>
      </div>
    </div>
  </section>

  <section class="closing">
    <div class="wrap">
      <h2>${esc(c.closing.h2a)}<em>${esc(c.closing.h2em)}</em>${esc(c.closing.h2b)}</h2>
      <p>${esc(c.closing.p)}</p>
      <a class="btn btn-white" href="${BOOK}" rel="noreferrer">${esc(c.closing.cta)} ${ARROW}</a>
      <div class="addr">${esc(c.closing.addr)}</div>
    </div>
  </section>

  <div class="compl-wrap"><p class="compl">${esc(c.compliance)}</p></div>

  <div class="vd-modal" id="bookModal" aria-hidden="true">
    <div class="vd-modal-back" data-close="1"></div>
    <div class="vd-modal-card" role="dialog" aria-modal="true">
      <span class="vd-modal-eyebrow">${esc(c.modal.eyebrow)}</span>
      <h3>${esc(c.modal.title)}</h3>
      <p class="vd-modal-intro">${esc(c.modal.intro)}</p>
      <div class="vd-modal-opts">
        <div class="vd-modal-opt"><b>${esc(c.modal.opt1t)}</b><span>${esc(c.modal.opt1d)}</span></div>
        <div class="vd-modal-opt"><b>${esc(c.modal.opt2t)}</b><span>${esc(c.modal.opt2d)}</span></div>
      </div>
      <a class="btn btn-primary vd-modal-go" href="${BOOK}" rel="noreferrer">${esc(c.modal.go)} ${ARROW}</a>
      <button type="button" class="vd-modal-cancel" data-close="1">${esc(c.modal.cancel)}</button>
    </div>
  </div>
  `;
}

/* ---------------- Interaktivität (im Browser) ---------------- */
function initDiag(root, c) {
  const st = c.cfg.stages;
  const $ = (sel) => root.querySelector(sel);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const elTotal = $("#totalNum"), elWerte = $("#werteNum"), elLabor = $("#laborNum");
  const elArc = $("#arc"), elTier = $("#tierLabel"), elTierDesc = $("#tierDesc");
  const elInherit = $("#inherit"), elInheritText = $("#inheritText");
  const seg = $("#seg"), segThumb = $("#segThumb");
  const sysblocks = $("#sysblocks"), pkgGrid = $("#pkgGrid");
  if (!seg || !elArc) return;
  const segBtns = Array.prototype.slice.call(seg.querySelectorAll("button"));

  let current = 0;
  const disp = { total: st[0].total, werte: st[0].werte, labor: st[0].labor, arc: st[0].werte / 120 };
  let rafId = null;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animateTo(stage) {
    const from = { total: disp.total, werte: disp.werte, labor: disp.labor, arc: disp.arc };
    const to = { total: stage.total, werte: stage.werte, labor: stage.labor, arc: stage.werte / 120 };
    const dur = reduceMotion ? 0 : 850;
    const start = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    function tick(now) {
      const t = dur === 0 ? 1 : Math.min((now - start) / dur, 1);
      const e = easeOutCubic(t);
      disp.total = from.total + (to.total - from.total) * e;
      disp.werte = from.werte + (to.werte - from.werte) * e;
      disp.labor = from.labor + (to.labor - from.labor) * e;
      disp.arc = from.arc + (to.arc - from.arc) * e;
      if (elTotal) elTotal.textContent = Math.round(disp.total);
      if (elWerte) elWerte.textContent = Math.round(disp.werte);
      if (elLabor) elLabor.textContent = Math.round(disp.labor);
      elArc.setAttribute("stroke-dashoffset", (CIRC * (1 - disp.arc)).toFixed(2));
      if (t < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  function positionThumb(idx) {
    const b = segBtns[idx];
    if (!b) return;
    segThumb.style.width = b.offsetWidth + "px";
    segThumb.style.transform = "translateX(" + b.offsetLeft + "px)";
  }

  function updateInherit(idx) {
    if (!elInherit) return;
    if (idx === 0) { elInherit.classList.remove("show"); return; }
    elInherit.classList.add("show");
    if (elInheritText) elInheritText.textContent = idx === 1 ? c.cfg.inherit1 : c.cfg.inherit2;
  }

  function updateSystems(idx) {
    const cards = Array.prototype.slice.call(sysblocks.querySelectorAll(".sys"));
    let n = 0;
    cards.forEach((card) => {
      const min = parseInt(card.getAttribute("data-min"), 10);
      const visible = min <= idx;
      card.style.display = visible ? "" : "none";
      const numEl = card.querySelector(".sys-num");
      const tagEl = card.querySelector(".sys-tag");
      if (visible) {
        n++;
        if (numEl) numEl.textContent = (n < 10 ? "0" + n : "" + n);
        if (tagEl) tagEl.style.display = (min === idx && idx > 0) ? "" : "none";
      }
    });
  }

  function select(idx) {
    current = idx;
    const s = st[idx];
    segBtns.forEach((b, i) => b.classList.toggle("act", i === idx));
    positionThumb(idx);
    animateTo(s);
    if (elTier) elTier.textContent = s.name;
    if (elTierDesc) elTierDesc.textContent = s.desc;
    updateInherit(idx);
    updateSystems(idx);
  }

  segBtns.forEach((b) =>
    b.addEventListener("click", () => select(parseInt(b.getAttribute("data-idx"), 10)))
  );

  // Systeme aufklappen
  if (sysblocks) {
    sysblocks.addEventListener("click", (e) => {
      const head = e.target && e.target.closest ? e.target.closest(".sys-head") : null;
      if (head) head.parentNode.classList.toggle("open");
    });
  }
  // Pakete aufklappen
  if (pkgGrid) {
    pkgGrid.addEventListener("click", (e) => {
      if (e.target && e.target.closest && e.target.closest(".pkg-book")) return;
      const head = e.target && e.target.closest ? e.target.closest(".pkg-head") : null;
      if (head) head.parentNode.classList.toggle("open");
    });
  }

  // Buchungs-Hinweis-Modal vor der Weiterleitung zu Doctolib
  const modal = root.querySelector("#bookModal");
  if (modal) {
    const openModal = () => { modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); };
    const closeModal = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); };
    root.querySelectorAll('a[href*="doctolib.de"]').forEach((a) => {
      if (a.classList.contains("vd-modal-go")) return;
      a.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
    });
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-close")) closeModal();
    });
    const goBtn = modal.querySelector(".vd-modal-go");
    if (goBtn) goBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  select(0);
  positionThumb(0);
  const reposition = () => positionThumb(current);
  window.addEventListener("load", reposition);
  window.addEventListener("resize", reposition);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposition);
}

/* ---------------- Komponente ---------------- */
export default function DiagnostikNew() {
  const lang = useLanguage();
  const c = CONTENT[lang] || CONTENT.de;
  const ref = useRef(null);
  const body = buildBody(c);

  useEffect(() => {
    if (ref.current) initDiag(ref.current, c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <div className="vd">
      <style dangerouslySetInnerHTML={{ __html: VD_CSS }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}

/* ---------------- Gekapseltes CSS (alle Regeln unter .vd) ---------------- */
const VD_CSS = `
.vd{
  --teal:#43a9ab;--teal-dark:#2d8789;--teal-darker:#1f6e70;--teal-pale:#e0f4f5;--teal-subtle:#f3faf9;
  --charcoal:#1a1f24;--gray:#515757;--gray-soft:#8a9a9a;--line:#e2eeee;--cream:#f5f3ed;
  --sans:var(--font-plus-jakarta),system-ui,sans-serif;--serif:var(--font-libre-baskerville),Georgia,serif;
  --ease:cubic-bezier(.22,1,.36,1);--spring:cubic-bezier(.34,1.4,.5,1);
  font-family:var(--sans);color:var(--charcoal);line-height:1.6;-webkit-font-smoothing:antialiased;background:#fff;overflow-x:hidden;
}
.vd *{box-sizing:border-box}
.vd .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.vd .btn{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:1rem;padding:15px 28px;border-radius:100px;text-decoration:none;cursor:pointer;border:none;transition:.3s var(--ease)}
.vd .btn-primary{color:#fff;background:var(--teal);box-shadow:0 14px 32px -14px rgba(67,169,171,.8)}
.vd .btn-primary:hover{background:var(--teal-dark);transform:translateY(-2px)}
.vd .btn-ghost{color:var(--teal-darker);background:#fff;border:1.5px solid var(--line)}
.vd .btn-ghost:hover{border-color:var(--teal);background:var(--teal-subtle)}
.vd .arrow{transition:transform .3s var(--ease)}
.vd .btn-primary:hover .arrow{transform:translateX(4px)}

.vd .hero{position:relative;padding:70px 0 60px;overflow:hidden;background:radial-gradient(120% 90% at 86% -10%,var(--teal-pale) 0%,rgba(224,244,245,0) 55%),radial-gradient(90% 70% at -5% 110%,var(--teal-subtle) 0%,rgba(243,250,249,0) 60%)}
.vd .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-darker);background:#fff;border:1.5px solid var(--line);padding:8px 16px;border-radius:100px}
.vd .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.vd .hero-h{font-size:clamp(2.4rem,5.6vw,4.2rem);line-height:1.03;letter-spacing:-.035em;font-weight:800;margin:24px 0 0;max-width:16ch}
.vd .hero-h em{font-family:var(--serif);font-weight:400;font-style:italic;color:var(--teal-darker)}
.vd .hero-sub{font-size:clamp(1.05rem,1.6vw,1.25rem);color:var(--gray);max-width:48ch;margin:24px 0 0}
.vd .usp-band{margin:30px 0 0;border-left:3px solid var(--teal);padding:4px 0 4px 20px}
.vd .usp-strike{font-family:var(--serif);font-style:italic;font-size:1.08rem;color:var(--gray-soft);text-decoration:line-through;text-decoration-thickness:1.5px}
.vd .usp-plan{font-family:var(--serif);font-style:italic;font-size:1.5rem;color:var(--charcoal);margin-top:3px}
.vd .usp-plan b{font-style:normal;font-weight:700;color:var(--teal-darker)}
.vd .hero-actions{margin:36px 0 0;display:flex;flex-wrap:wrap;gap:13px}

.vd .sec{padding:80px 0}
.vd .sec-tag{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px}
.vd .sec-h{font-size:clamp(2rem,3.7vw,2.9rem);line-height:1.07;letter-spacing:-.03em;font-weight:800;max-width:24ch;margin:0}
.vd .sec-h em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal-darker)}
.vd .sec-lead{font-size:1.12rem;color:var(--gray);max-width:56ch;margin-top:16px}

.vd .afeature-sec{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.vd .afeature{display:grid;grid-template-columns:1fr 1.1fr;gap:46px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:30px;padding:34px;box-shadow:0 50px 120px -70px rgba(31,110,112,.42)}
.vd .afeature-media{aspect-ratio:4/3.2;border-radius:26px;overflow:hidden;box-shadow:0 50px 100px -52px rgba(31,110,112,.6);background:var(--teal-pale)}
.vd .afeature-media img{width:100%;height:100%;object-fit:cover;display:block}
.vd .aglance{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
.vd .aglance li{display:flex;align-items:flex-start;gap:11px;font-size:1rem;color:var(--charcoal);line-height:1.5}
.vd .aglance li svg{color:var(--teal);flex:none;margin-top:3px}
@media(max-width:900px){.vd .afeature{grid-template-columns:1fr;gap:24px;padding:20px}.vd .afeature-media{aspect-ratio:4/3}}

.vd .whygrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
@media(max-width:820px){.vd .whygrid{grid-template-columns:1fr}}
.vd .whyc{border:1px solid var(--line);border-radius:20px;padding:28px 24px;background:#fff;transition:.4s var(--ease)}
.vd .whyc:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 28px 56px -40px rgba(31,110,112,.5)}
.vd .whyc .ic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:16px}
.vd .whyc h4{font-size:1.12rem;font-weight:700;letter-spacing:-.01em;margin:0}
.vd .whyc p{font-size:.92rem;color:var(--gray);line-height:1.6;margin-top:8px;overflow-wrap:break-word}

.vd .cfg{background:linear-gradient(180deg,#fff 0%,var(--teal-subtle) 100%)}
.vd .cfg-shell{margin-top:40px;background:#fff;border:1px solid var(--line);border-radius:30px;box-shadow:0 50px 120px -60px rgba(31,110,112,.42);overflow:hidden}
.vd .cfg-grid{display:grid;grid-template-columns:.92fr 1.28fr;align-items:start}
@media(max-width:920px){.vd .cfg-grid{grid-template-columns:1fr}}
.vd .cfg-left{padding:40px 38px;border-right:1px solid var(--line);background:var(--teal-subtle);min-width:0}
@media(max-width:920px){.vd .cfg-left{border-right:none;border-bottom:1px solid var(--line)}}
.vd .honorar-note{font-size:.86rem;color:var(--gray);background:#fff;border:1px solid var(--line);border-radius:15px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;line-height:1.55}
.vd .honorar-note b{color:var(--charcoal)}
.vd .honorar-note .ic{color:var(--teal);flex:none;margin-top:1px}
.vd .seg-hint{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:22px;font-size:.8rem;font-weight:700;color:var(--teal-darker)}
.vd .seg-hint svg{color:var(--teal);flex:none}
.vd .seg{margin-top:12px;background:#eaf5f5;border:1px solid var(--line);border-radius:100px;padding:5px;display:flex;position:relative}
.vd .seg-thumb{position:absolute;top:5px;bottom:5px;left:0;border-radius:100px;background:#fff;box-shadow:0 6px 18px -8px rgba(31,110,112,.55);transition:transform .5s var(--spring),width .5s var(--spring)}
.vd .seg button{position:relative;z-index:2;flex:1;border:none;background:none;cursor:pointer;font-family:var(--sans);font-weight:600;font-size:.92rem;color:var(--gray-soft);padding:12px 6px;border-radius:100px;transition:color .3s var(--ease)}
.vd .seg button.act{color:var(--teal-darker)}
.vd .seg button small{display:block;font-weight:500;font-size:.66rem;color:var(--gray-soft);margin-top:2px}
.vd .seg button.act small{color:var(--teal)}
.vd .seg .pop-tag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);font-size:.56rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:var(--teal);padding:3px 9px;border-radius:100px;white-space:nowrap;z-index:4}
.vd .price-block{margin-top:32px;display:flex;align-items:center;gap:22px}
.vd .arc-wrap{position:relative;width:150px;height:150px;flex:none}
.vd .arc-wrap svg{transform:rotate(-90deg);display:block}
.vd .arc-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.vd .arc-center .valn{font-family:var(--serif);font-size:2.3rem;line-height:1;color:var(--charcoal)}
.vd .arc-center .vals{font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:7px}
.vd .arc-center .vall{font-size:.62rem;color:var(--gray-soft);margin-top:7px}
.vd .price-detail{flex:1;min-width:0}
.vd .price-tier{font-size:.74rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal-darker)}
.vd .price-big{font-family:var(--serif);font-size:2.8rem;line-height:1;letter-spacing:-.02em;margin:7px 0 4px}
.vd .price-big .eur{font-size:1.3rem;color:var(--gray-soft);font-family:var(--sans);font-weight:600;margin-left:2px}
.vd .price-break{font-size:.85rem;color:var(--gray);line-height:1.55}
.vd .price-break b{color:var(--charcoal);font-weight:700}
.vd .tier-desc{margin-top:20px;font-size:.94rem;color:var(--gray);line-height:1.62}
.vd .cfg-book{margin-top:22px;width:100%;justify-content:center}
@media(max-width:560px){.vd .price-block{flex-direction:column;align-items:center;text-align:center;gap:18px}.vd .price-detail{width:100%;min-width:0}.vd .price-big{font-size:2.5rem}}
.vd .cfg-right{padding:36px 36px 42px;background:#fff;min-width:0}
.vd .right-head{font-weight:700;font-size:1.08rem;letter-spacing:-.01em}
.vd .inherit{margin-top:15px;display:none;align-items:center;gap:10px;font-size:.86rem;color:var(--teal-darker);background:var(--teal-pale);border:1px solid rgba(67,169,171,.3);padding:11px 15px;border-radius:13px;font-weight:600}
.vd .inherit.show{display:flex}
.vd .inherit .ck{width:20px;height:20px;border-radius:50%;background:#fff;color:var(--teal-dark);display:grid;place-items:center;flex:none;font-weight:800;font-size:.72rem}
.vd .sysblocks{margin-top:20px;display:flex;flex-direction:column;gap:12px}
.vd .sys{position:relative;border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden;transition:border-color .3s var(--ease),box-shadow .3s var(--ease)}
.vd .sys::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--teal);opacity:.5;transition:opacity .3s}
.vd .sys.open{border-color:var(--teal);box-shadow:0 18px 40px -30px rgba(67,169,171,.7)}
.vd .sys.open::before{opacity:1}
.vd .sys-head{display:flex;align-items:center;gap:12px;padding:15px 18px 15px 22px;cursor:pointer;user-select:none;transition:background .3s var(--ease)}
.vd .sys-head:hover{background:var(--teal-subtle)}
.vd .sys-num{font-family:var(--serif);font-size:1.05rem;color:var(--teal);line-height:1;flex:none;min-width:1.7em}
.vd .sys-name{font-weight:700;font-size:1.05rem;letter-spacing:-.01em;flex:1;min-width:0}
.vd .sys-tag{font-size:.56rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--teal);padding:3px 8px;border-radius:100px;flex:none}
.vd .sys-count{font-size:.72rem;font-weight:700;color:var(--teal-darker);background:var(--teal-pale);padding:4px 10px;border-radius:100px;flex:none}
.vd .sys-chev{color:var(--gray-soft);flex:none;display:flex;transition:transform .4s var(--spring)}
.vd .sys.open .sys-chev{transform:rotate(180deg);color:var(--teal)}
.vd .sys-body{max-height:0;overflow:hidden;transition:max-height .45s var(--ease)}
.vd .sys.open .sys-body{max-height:640px}
.vd .sys-body-in{padding:2px 20px 18px 22px}
.vd .sys-benefit{font-family:var(--serif);font-style:italic;font-size:.92rem;color:var(--gray);margin:0 0 12px;line-height:1.5}
.vd .mkrow{display:flex;flex-wrap:wrap;gap:8px}
.vd .mk{font-size:.9rem;font-weight:500;color:var(--teal-darker);background:var(--teal-subtle);border:1px solid var(--line);padding:7px 14px;border-radius:100px;line-height:1.2}

.vd .methods{background:#fff}
.vd .mgrid{margin-top:44px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.vd .mgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.vd .mgrid{grid-template-columns:1fr}}
.vd .mcard{border:1px solid var(--line);border-radius:20px;padding:26px 22px;background:#fff;transition:.4s var(--ease);position:relative}
.vd .mcard:hover{border-color:var(--teal);transform:translateY(-5px);box-shadow:0 28px 56px -40px rgba(31,110,112,.6)}
.vd .mcard .step{font-family:var(--serif);font-size:1.6rem;color:var(--teal-pale);position:absolute;top:16px;right:22px}
.vd .mcard h4{font-size:1.05rem;font-weight:700;margin-top:6px}
.vd .mcard .sub{font-size:.78rem;font-weight:700;color:var(--teal);letter-spacing:.04em;margin-top:2px}
.vd .mcard p{font-size:.88rem;color:var(--gray);margin-top:10px;line-height:1.55}
.vd .mfoot{margin-top:32px;font-size:.98rem;color:var(--gray);display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.vd .mfoot .pill{font-weight:700;color:var(--teal-darker);background:var(--teal-pale);padding:7px 15px;border-radius:100px;font-size:.9rem}

.vd .focus{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.vd .fgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:900px){.vd .fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.vd .fgrid{grid-template-columns:1fr}}
.vd .fcard{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff;transition:.4s var(--ease)}
.vd .fcard:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 24px 50px -38px rgba(31,110,112,.55)}
.vd .fcard .ic{width:44px;height:44px;border-radius:12px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:14px}
.vd .fcard h4{font-size:1.08rem;font-weight:700;letter-spacing:-.01em;margin:0 0 12px}
.vd .fcard ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.vd .fcard li{display:flex;align-items:flex-start;gap:9px;font-size:.9rem;color:var(--gray);line-height:1.45;overflow-wrap:break-word;min-width:0}
.vd .fcard li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--teal);margin-top:7px}

.vd .saeuleb{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.vd .trenn{background:var(--charcoal);color:#fff;border-radius:30px;padding:52px 48px;position:relative;overflow:hidden}
.vd .trenn::before{content:"";position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(67,169,171,.22),transparent 68%);top:-140px;right:-90px}
.vd .trenn .tt{position:relative;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px;display:inline-block}
.vd .trenn h3{position:relative;font-size:clamp(1.6rem,3vw,2.4rem);letter-spacing:-.02em;font-weight:800;max-width:24ch;line-height:1.14;margin:0}
.vd .trenn h3 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal)}
.vd .trenn>p{position:relative;color:rgba(255,255,255,.72);margin-top:15px;max-width:54ch;font-size:1.02rem}
.vd .pkg-grid{margin-top:26px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
@media(max-width:820px){.vd .pkg-grid{grid-template-columns:1fr}}
.vd .pkg{border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden;transition:border-color .3s var(--ease),box-shadow .3s var(--ease)}
.vd .pkg.open{border-color:var(--teal);box-shadow:0 26px 54px -36px rgba(31,110,112,.6)}
.vd .pkg-head{display:flex;align-items:center;gap:15px;padding:19px 20px;cursor:pointer;user-select:none;transition:background .3s var(--ease)}
.vd .pkg-head:hover{background:var(--teal-subtle)}
.vd .pkg-ic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;flex:none}
.vd .pkg-ti{flex:1;min-width:0}
.vd .pkg-ti h4{font-size:1.1rem;font-weight:700;letter-spacing:-.01em;margin:0}
.vd .pkg-for{font-size:.83rem;color:var(--gray-soft);margin-top:3px;line-height:1.4}
.vd .pkg-price{font-family:var(--serif);font-size:1.16rem;color:var(--teal-darker);white-space:nowrap;flex:none}
.vd .pkg-chev{color:var(--gray-soft);flex:none;display:flex;transition:transform .4s var(--spring)}
.vd .pkg.open .pkg-chev{transform:rotate(180deg);color:var(--teal)}
.vd .pkg-body{max-height:0;overflow:hidden;transition:max-height .5s var(--ease)}
.vd .pkg.open .pkg-body{max-height:900px}
.vd .pkg-body-in{padding:2px 22px 22px}
.vd .pkg-benefit{font-family:var(--serif);font-style:italic;font-size:.95rem;color:var(--gray);line-height:1.55;border-left:3px solid var(--teal-pale);padding-left:14px;margin-bottom:15px}
.vd .pkg .mkrow{margin-bottom:15px}
.vd .pkg .mk{font-size:.85rem;padding:6px 13px}
.vd .pkg-allin{font-size:.78rem;color:var(--gray-soft);margin-bottom:15px;line-height:1.5}
.vd .pkg-book{display:inline-flex;align-items:center;gap:8px;font-size:.9rem;font-weight:600;color:#fff;background:var(--teal);padding:11px 22px;border-radius:100px;text-decoration:none;transition:.3s var(--ease)}
.vd .pkg-book:hover{background:var(--teal-dark);transform:translateY(-2px)}

.vd .mentor{background:#fff}
.vd .mentor-in{background:linear-gradient(135deg,var(--teal-darker),var(--teal-dark) 60%,var(--teal));border-radius:28px;padding:48px 44px;color:#fff;position:relative;overflow:hidden}
.vd .mentor-in::before{content:"";position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%);top:-120px;right:-80px}
.vd .mentor-in .tt{position:relative;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#bfe3e3;display:inline-block;margin-bottom:12px}
.vd .mentor-in h2{position:relative;font-size:clamp(1.6rem,3vw,2.3rem);font-weight:800;letter-spacing:-.02em;max-width:22ch;line-height:1.14;margin:0}
.vd .mentor-in h2 em{font-family:var(--serif);font-style:italic;font-weight:400}
.vd .mentor-in p{position:relative;color:rgba(255,255,255,.85);margin-top:14px;max-width:58ch;font-size:1.05rem;line-height:1.6}

.vd .closing{background:linear-gradient(160deg,var(--teal-darker),var(--teal-dark) 55%,var(--teal));color:#fff;position:relative;overflow:hidden}
.vd .closing .wrap{text-align:center;padding:92px 24px}
.vd .closing h2{font-size:clamp(2rem,3.8vw,3rem);font-weight:800;letter-spacing:-.03em;margin:0}
.vd .closing h2 em{font-family:var(--serif);font-style:italic;font-weight:400}
.vd .closing p{color:rgba(255,255,255,.86);margin:18px auto 0;max-width:48ch;font-size:1.08rem}
.vd .closing .btn-white{margin-top:34px;background:#fff;color:var(--teal-darker)}
.vd .closing .btn-white:hover{background:var(--cream);transform:translateY(-2px)}
.vd .closing .addr{margin-top:30px;font-size:.94rem;color:rgba(255,255,255,.82)}
.vd .compl-wrap{padding:40px 24px 10px;text-align:center}
.vd .compl{margin:0 auto;max-width:64ch;font-size:.78rem;color:var(--gray-soft);line-height:1.65}
.vd .vd-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:20px}
.vd .vd-modal.open{display:flex}
.vd .vd-modal-back{position:absolute;inset:0;background:rgba(26,31,36,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.vd .vd-modal-card{position:relative;background:#fff;border-radius:22px;max-width:440px;width:100%;padding:30px 28px;box-shadow:0 40px 100px -30px rgba(15,20,23,.55);text-align:left}
.vd .vd-modal-eyebrow{font-size:.7rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--teal)}
.vd .vd-modal-card h3{font-size:1.35rem;font-weight:800;letter-spacing:-.02em;margin:8px 0 6px}
.vd .vd-modal-intro{font-size:.95rem;color:var(--gray);line-height:1.55;margin-bottom:16px}
.vd .vd-modal-opts{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.vd .vd-modal-opt{border:1px solid var(--line);border-radius:14px;padding:13px 15px;background:var(--teal-subtle)}
.vd .vd-modal-opt b{display:block;font-size:.98rem;color:var(--teal-darker);font-weight:700}
.vd .vd-modal-opt span{display:block;font-size:.85rem;color:var(--gray);margin-top:2px;line-height:1.45}
.vd .vd-modal-go{width:100%;justify-content:center}
.vd .vd-modal-cancel{display:block;width:100%;margin-top:10px;background:none;border:none;color:var(--gray-soft);font-family:var(--sans);font-size:.9rem;font-weight:600;cursor:pointer;padding:8px;border-radius:8px}
.vd .vd-modal-cancel:hover{color:var(--gray)}
`;
