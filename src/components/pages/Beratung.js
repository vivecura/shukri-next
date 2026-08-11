"use client";

/**
 * Ganzheitliche Beratung. Bereich /beratung (EN /en/consultations), ViveCura Berlin.
 * Stil & CSS-System wie /eiseninfusion (gekapselt unter .ber, kein Leaken).
 * Dynamische Elemente: klickbares Blutdruck-Beispiel, Gesundheits-Spektrum (30/60/100 %),
 *   interaktive Plan-Saeulen (multidisziplinaerer Plan).
 * STIL: Du-Anrede, keine Gedankenstriche im Fliesstext, kann-Form (kein Heilversprechen),
 *       sowohl-als-auch statt Abwertung der Kollegen (Anwalts-Gate), moegliche Ursachen (nicht "die").
 * PREIS: 30 Minuten Beratung 100 EUR, online zum selben Preis wie in der Praxis.
 */

import { useEffect, useRef, useState } from "react";
import useLanguage from "@/hooks/useLanguage";

const BOOK =
  "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile";

/* ---------------- Icons (JSX) ---------------- */
const S = (inner) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {inner}
  </svg>
);
const IC = {
  magnifier: () => S(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  layers: () => S(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5" /><path d="M3 16.5l9 5 9-5" /></>),
  shield: () => S(<><path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9.5-4.8-1.2-8-5-8-9.5V6z" /><path d="M9 12l2 2 4-4" /></>),
  help: () => S(<><circle cx="12" cy="12" r="9" /><path d="M9.2 9.5a2.8 2.8 0 0 1 5.4 1c0 1.9-2.6 2.3-2.6 4" /><path d="M12 17.5h.01" /></>),
  ear: () => S(<path d="M6 9a6 6 0 0 1 12 0c0 3.5-2.6 4.8-4.2 6.3C12.6 16.4 12 17.7 12 19a3 3 0 0 1-5.4 1.8M9 9a3 3 0 0 1 5.7-1.3" />),
  target: () => S(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>),
  droplet: () => S(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />),
  stomach: () => S(<path d="M8 3v5a5 5 0 0 0 5 5h1a4 4 0 0 1 0 8c-3.5 0-6-2.5-6-6" />),
  flask: () => S(<><path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M9 3h6" /></>),
  bolt: () => S(<path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />),
  video: () => S(<><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3" /></>),
  file: () => S(<><path d="M6 2h8l6 6v14H6z" /><path d="M14 2v6h6M9 14h6M9 17h6" /></>),
  leaf: () => S(<path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16zM4 20c4-4 8-6 12-7" />),
  heart: () => S(<path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z" />),
  pill: () => S(<><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" /><path d="M8.5 8.5l7 7" /></>),
  brain: () => S(<><path d="M8.5 6A2.5 2.5 0 0 1 12 4a2.5 2.5 0 0 1 3.5 2" /><path d="M6.5 9A2.5 2.5 0 0 0 6 14" /><path d="M17.5 9a2.5 2.5 0 0 1 .5 5" /><path d="M8.5 18A2.5 2.5 0 0 0 12 20a2.5 2.5 0 0 0 3.5-2" /><path d="M12 4v16" /></>),
  spark: () => S(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />),
  flame: () => S(<path d="M12 12c2-3 0-7-1-8 0 3-1.8 4.7-3 6s-2 3.2-2 5a6 6 0 1 0 12 0c0-1.5-1.1-3.9-2-5-1.8 3-2.8 3-4 2z" />),
  activity: () => S(<path d="M2 12h4l2.5-7 4.5 15 3-8 2 3h4" />),
};
const CHECK = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const ARROW = () => (
  <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const CHEV = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/* ---------------- Inhalt ---------------- */
const CONTENT = {
  de: {
    diagHref: "/diagnostik",
    hero: {
      eyebrow: "Ganzheitliche Beratung · Berlin & online",
      h1a: "Ein Blick auf dich, ",
      h1em: "der weitergeht",
      h1b: " als der Befund.",
      sub:
        "In 30 Minuten schauen wir gemeinsam auf deine ganze Geschichte: Beschwerden, Werte, Lebensstil. Ich denke über die Fachgrenzen hinweg, sortiere die Komplexität, und du gehst mit einem konkreten ersten Plan wieder raus. Online per Video oder bei mir in der Praxis in Berlin.",
      strike: "Nur den einen Wert senken, der auffällt.",
      planPre: "Verstehen, ",
      planB: "was dahinterstecken kann",
      planPost: ".",
      priceNote: "30 Minuten für 100 €. Online wie in der Praxis.",
      cta: "Termin buchen",
      ghost: "Was kostet das?",
    },
    subnav: [
      { to: "vergleich", label: "Der Unterschied" },
      { to: "fuerwen", label: "Für wen" },
      { to: "themen", label: "Themen" },
      { to: "spektrum", label: "Spektrum" },
      { to: "ablauf", label: "Ablauf" },
      { to: "diagnostik", label: "Diagnostik" },
      { to: "online", label: "Online" },
      { to: "plan", label: "Dein Plan" },
      { to: "kosten", label: "Kosten" },
    ],
    vergleich: {
      tag: "Der Unterschied",
      h2a: "Zwei Wege, ",
      h2em: "dieselbe",
      h2b: " Beschwerde.",
      lead:
        "Dieselbe Diagnose kann bei zwei Menschen ganz verschiedene Geschichten haben. Genau da setze ich an, zusätzlich zu dem, was die klassische Medizin schon gut kann.",
      classic: {
        title: "Der klassische Blick",
        points: [
          "Erkennt die Diagnose zuverlässig",
          "Senkt den auffälligen Wert und schützt dich damit sofort",
          "Klare Leitlinien, gut untersucht",
        ],
      },
      holistic: {
        title: "Mein zusätzlicher Blick",
        points: [
          "Fragt, was den Wert antreiben könnte",
          "Sucht mögliche Auslöser: Stress, Belastungen, Darm, Ernährung",
          "Arbeitet an möglichen Ursachen, damit später weniger nötig sein kann",
        ],
      },
      exampleTag: "Ein einfaches Beispiel",
      exampleTitle: "Zwei Menschen, hoher Blutdruck: 150 zu 95.",
      exampleSub:
        "Bewusst einfach gehalten, damit das Prinzip klar wird. In der Praxis schaue ich auf deutlich komplexere Zusammenhänge, nicht nur auf den Blutdruck.",
      readingLabel: "Gleicher Wert",
      reveal: "Was steckt dahinter?",
      persons: [
        {
          id: "A",
          name: "Person A",
          tag: "45, viel Verantwortung",
          reading: "150 / 95",
          cause:
            "Dahinter können chronischer Stress, alte Traumata und der Lebensstil stecken, also Schlaf, Ernährung und Bewegung. Genau da arbeiten wir gemeinsam.",
        },
        {
          id: "B",
          name: "Person B",
          tag: "52, oft müde",
          reading: "150 / 95",
          cause:
            "Hier können Belastungen durch Toxine, Schwermetalle, Schimmel, Parasiten oder Umweltfaktoren mitspielen. Wir schauen auf Ausleitung, Darm und dein Umfeld.",
        },
      ],
      bridge:
        "Der Wert wird bei beiden im Blick behalten. Was ihn antreibt, kann aber völlig verschieden sein, und genau das verändert den Plan. Ich ersetze die klassische Medizin nicht, ich denke sie weiter.",
    },
    fuerwen: {
      tag: "Für wen",
      h2a: "Und auch ohne Diagnose ",
      h2em: "genau richtig",
      h2b: ".",
      lead:
        "Viele kommen mit einem klaren Anliegen. Genauso viele mit dem Gefühl: irgendetwas stimmt nicht, ich weiß nur nicht was. Beides gehört hierher.",
      cards: [
        { ic: "magnifier", t: "Beschwerden ohne klare Ursache", p: "Du hast Symptome, aber bisher hat niemand den roten Faden gefunden." },
        { ic: "layers", t: "Lust auf eine zweite Sicht", p: "Du möchtest deine Werte und Beschwerden aus einem anderen Blickwinkel einordnen lassen." },
        { ic: "shield", t: "Gesund bleiben, bevor etwas kippt", p: "Du fühlst dich wohl und willst früh gegensteuern, statt zu warten, bis etwas weh tut." },
        { ic: "help", t: "Einfach mal schauen, was geht", p: "Du hast kein konkretes Anliegen und willst wissen, wie ich dir überhaupt helfen könnte." },
      ],
      foot:
        "Du musst nicht krank sein, um zu kommen. Ein Gespräch reicht, um zu sehen, was möglich ist.",
    },
    themen: {
      tag: "Häufige Themen",
      h2a: "Womit Menschen ",
      h2em: "zu mir kommen",
      h2b: ".",
      lead:
        "Viele Menschen bringen keine fertige Diagnose mit, sondern Beschwerden, die sich bisher schwer einordnen ließen. Hier findest du Beispiele für Themen, mit denen Menschen zu mir in die Praxis kommen und mit denen wir uns gemeinsam beschäftigen.",
      cats: [
        { ic: "droplet", t: "Hormone & Zyklus", items: ["Östrogendominanz und Progesteronmangel", "PCOS (Polyzystisches Ovarialsyndrom)", "Endometriose", "Wechseljahresbeschwerden (Perimenopause und Menopause)", "Testosteronmangel beim Mann", "Prämenstruelles Syndrom und PMDS", "Unerfüllter Kinderwunsch"] },
        { ic: "stomach", t: "Darm, Verdauung & Unverträglichkeiten", items: ["Reizdarmsyndrom", "Verdauungsstörungen (Blähungen, Völlegefühl)", "Dünndarmfehlbesiedlung (SIBO)", "Leaky Gut und Darmdysbiose", "Nahrungsmittelunverträglichkeiten (Laktose, Fruktose, Gluten)", "Chronischer Reflux und Sodbrennen"] },
        { ic: "brain", t: "Psyche, Trauma & Schlaf", items: ["Burnout", "Depression und Stimmungsschwankungen", "Trauma und Posttraumatische Belastungsstörung (PTBS)", "Angststörungen und Panikattacken", "Schlafprobleme (Ein- und Durchschlafstörungen)", "ADHS im Erwachsenenalter", "Innere Unruhe und Reizbarkeit"] },
        { ic: "bolt", t: "Erschöpfung, Energie & Longevity", items: ["ME/CFS (chronisches Erschöpfungssyndrom)", "Long Covid und Post-Covid-Syndrom", "Mitochondriale Dysfunktion (Energiestoffwechsel)", "Nährstoffbedingte Erschöpfung (Eisen, Vitamin D, B12)", "Nebennierenschwäche und gestörte Cortisol-Rhythmik", "POTS und orthostatische Intoleranz", "Beschleunigte Zellalterung (Longevity)"] },
        { ic: "heart", t: "Stoffwechsel, Blutzucker & Herz-Kreislauf", items: ["Diabetes Typ 2 und Prädiabetes", "Insulinresistenz", "Metabolisches Syndrom", "Bluthochdruck (arterielle Hypertonie)", "Erhöhtes Cholesterin (Fettstoffwechselstörung)", "Nichtalkoholische Fettleber (NAFLD)", "Hartnäckiges Übergewicht und Bauchfett"] },
        { ic: "shield", t: "Immunsystem, Autoimmun & Umwelt", items: ["Autoimmunerkrankungen (z.B. Hashimoto, Rheuma, Lupus)", "Mastzellaktivierung (MCAS)", "Histaminintoleranz", "Chronische stille Entzündung (Silent Inflammation)", "Wiederkehrende Infekte und Infektanfälligkeit", "Schwermetallbelastung (z.B. Blei, Quecksilber)", "Schimmel- und Mykotoxin-Belastung (CIRS)"] },
      ],
      foot:
        "Du erkennst dich hier nicht genau wieder oder hast noch keine klare Diagnose? Auch dann lohnt sich das Gespräch, denn oft beginnt der Weg genau bei den Fragen, die bisher offen geblieben sind.",
    },
    spektrum: {
      tag: "Gesundheit ist ein Spektrum",
      h2a: "Kein fester Zustand, ",
      h2em: "sondern Lebendigkeit",
      h2b: ".",
      lead:
        "Gesundheit ist nicht einfach die Abwesenheit einer Diagnose. Sie ist ein Spektrum. Es geht nicht darum, gerade so zu funktionieren, sondern darum, wirklich lebendig zu sein. Wo stehst du gerade?",
      levels: [
        { pct: 30, label: "Überleben", title: "Du funktionierst, mehr nicht", text: "Kein klarer Befund, und trotzdem wenig Energie. Du kommst durch den Tag, aber es fühlt sich nicht nach dir an." },
        { pct: 60, label: "Funktionieren", title: "Der Alltag läuft", text: "Vieles ist in Ordnung, aber etwas fehlt: Schlaf, Fokus, Antrieb, Leichtigkeit. Da ist mehr möglich." },
        { pct: 100, label: "Lebendigkeit", title: "Wach, klar, belastbar", text: "Nicht nur ohne Beschwerden, sondern voller Energie. Das ist das Ziel, an dem wir gemeinsam arbeiten können." },
      ],
      markerNote:
        "Deshalb schaue ich nicht auf einen einzigen Wert, sondern je nach Fragestellung auf 40 bis 120 Marker.",
      diagCta: "Mehr zur Diagnostik",
    },
    ablauf: {
      tag: "So läuft es",
      h2a: "Beratung, Diagnostik, ",
      h2em: "dein Erstplan",
      h2b: ".",
      steps: [
        { step: "01", ic: "ear", name: "Beratung", text: "30 Minuten Raum für deine Beschwerden, deine Geschichte, deine Biografie. Deine Empfindung nehme ich ernst, auch wenn ein Befund sie noch nicht erklärt." },
        { step: "02", ic: "magnifier", name: "Sinnvolle Diagnostik", text: "Ich fordere gezielt die Untersuchungen an, die deine nächsten Schritte wirklich verändern. Keine Tests um der Tests willen." },
        { step: "03", ic: "target", name: "Dein Erstplan", text: "Du gehst mit einer klaren ersten Roadmap raus, abgestimmt auf dich und über die Fachgrenzen hinweg gedacht." },
      ],
    },
    diagnostik: {
      tag: "Diagnostik",
      h2a: "Tests, die ",
      h2em: "Antworten",
      h2b: " geben.",
      lead:
        "Gute Diagnostik geht oft über das Standardlabor hinaus. Ich kombiniere, was zu deiner Frage passt, und erkläre dir jeden Schritt vorher.",
      cards: [
        { ic: "droplet", t: "Blut", p: "Umfassende Laborwerte, auch Nährstoffe und Marker, die im Standardcheck oft fehlen." },
        { ic: "stomach", t: "Stuhl", p: "Ein Blick auf Darmflora und Verdauung, häufig ein unterschätzter Schlüssel." },
        { ic: "flask", t: "Urin", p: "Hinweise auf Stoffwechsel und mögliche Belastungen des Körpers." },
        { ic: "bolt", t: "Stress und Belastung", p: "Marker rund um Stress und Regeneration, um zu sehen, was dein System gerade fordert." },
      ],
      foot:
        "Welche Tests sinnvoll sind, entscheiden wir zusammen, nachvollziehbar und transparent. Vieles davon lässt sich auch bequem von zuhause aus starten.",
      cta: "Zur Diagnostik-Seite",
    },
    online: {
      tag: "Online möglich",
      h2a: "Die ganze Beratung, ",
      h2em: "auch per Video",
      h2b: ".",
      lead:
        "Wo du wohnst, soll keine Rolle spielen. Erstgespräch, Befundbesprechung und Plan gehen genauso online, sicher per Video, zum selben Preis wie in der Praxis.",
      steps: [
        { step: "01", ic: "video", name: "Video-Gespräch", text: "Wir starten mit dem Erstgespräch per sicherem Video-Call, ganz bequem von zuhause." },
        { step: "02", ic: "droplet", name: "Passende Diagnostik", text: "Ich fordere die Tests an. Stuhl und Urin gehen von zuhause, die Blutabnahme machst du vor Ort oder in einem Labor in deiner Nähe." },
        { step: "03", ic: "file", name: "Befund und Plan", text: "Deine Ergebnisse und deinen Erstplan besprechen wir gemeinsam per Video." },
      ],
      foot:
        "So bekommst du dieselbe Beratung, egal ob du in Berlin, in Hamburg oder im Ausland bist.",
    },
    plan: {
      tag: "Ein möglicher Plan",
      h2a: "So könnte dein ",
      h2em: "Plan",
      h2b: " aussehen.",
      lead:
        "Aus Beratung und Diagnostik entsteht dein Plan. Er darf aus mehreren Disziplinen kommen, immer so, wie es zu dir passt. Tippe eine Säule an.",
      pillars: [
        { ic: "heart", name: "Lebensstil", text: "Der Alltag ist die stärkste Medizin.", methods: ["Ernährungsumstellung", "Atemtherapie", "Bewegungsoptimierung"] },
        { ic: "droplet", name: "Entgiftung", text: "Den Körper dort entlasten, wo er belastet ist.", methods: ["Ausleitungs- und Entgiftungsstrategien", "zum Beispiel über Infusionen"] },
        { ic: "leaf", name: "Pflanzenheilkunde", text: "Pflanzliche Heilmittel, gezielt eingesetzt.", methods: ["Pflanzliche Mittel nach anthroposophischer Medizin"] },
        { ic: "pill", name: "Nährstofftherapie", text: "Auffüllen, was fehlt.", methods: ["Nach orthomolekularer Medizin", "Als Tabletten oder als Infusion"] },
        { ic: "brain", name: "Psyche", text: "Körper und Psyche gehören zusammen.", methods: ["Psychotherapie mit Somatic Experiencing", "Ketamin-assistierte Infusionen"] },
      ],
    },
    kosten: {
      tag: "Kosten",
      h2a: "Transparent, ",
      h2em: "ohne Überraschung",
      h2b: ".",
      priceTag: "Erstberatung",
      priceName: "30 Minuten Beratung",
      priceAmount: "100 €",
      priceNote:
        "Online per Video oder in der Praxis in Berlin, zum selben Preis. Längere Termine sind möglich, den Umfang stimmen wir vorher ab.",
      valueTitle: "Das ist immer drin:",
      value: [
        "Interdisziplinärer Blick auf alle deine Beschwerden",
        "Empfehlung und Anforderung der passenden Diagnostik",
        "Ein konkreter erster Plan zum Mitnehmen",
        "Zeit und echtes Zuhören, ohne Hektik",
      ],
      note:
        "Die Beratung ist eine private Selbstzahlerleistung. Die Kosten möglicher Diagnostik hängen vom Umfang ab und bespreche ich immer vorher mit dir.",
    },
    closing: {
      h2a: "Bereit für einen ",
      h2em: "anderen Blick",
      h2b: "?",
      p: "Buch dir dein Erstgespräch, online per Video oder in der Praxis in Berlin. Wir schauen gemeinsam, was hinter deinen Beschwerden stecken könnte.",
      cta: "Termin buchen",
      addr: "ViveCura · Berlin · online und vor Ort",
    },
  },

  en: {
    diagHref: "/en/diagnostics",
    hero: {
      eyebrow: "Holistic consultation · Berlin & online",
      h1a: "A look at you that ",
      h1em: "goes further",
      h1b: " than the lab report.",
      sub:
        "In 30 minutes we look at your whole story together: symptoms, values, lifestyle. I think across the boundaries of the medical fields, sort through the complexity, and you leave with a concrete first plan. Online by video or with me at the practice in Berlin.",
      strike: "Just lowering the one value that stands out.",
      planPre: "Understanding ",
      planB: "what may be behind it",
      planPost: ".",
      priceNote: "30 minutes for €100. Online just like at the practice.",
      cta: "Book an appointment",
      ghost: "What does it cost?",
    },
    subnav: [
      { to: "vergleich", label: "The difference" },
      { to: "fuerwen", label: "Who it is for" },
      { to: "themen", label: "Topics" },
      { to: "spektrum", label: "Spectrum" },
      { to: "ablauf", label: "How it works" },
      { to: "diagnostik", label: "Diagnostics" },
      { to: "online", label: "Online" },
      { to: "plan", label: "Your plan" },
      { to: "kosten", label: "Cost" },
    ],
    vergleich: {
      tag: "The difference",
      h2a: "Two paths, ",
      h2em: "the same",
      h2b: " symptom.",
      lead:
        "The same diagnosis can have very different stories in two people. That is exactly where I come in, in addition to what conventional medicine already does well.",
      classic: {
        title: "The conventional view",
        points: [
          "Recognises the diagnosis reliably",
          "Lowers the value that stands out and protects you right away",
          "Clear guidelines, well researched",
        ],
      },
      holistic: {
        title: "My additional view",
        points: [
          "Asks what could be driving the value",
          "Looks for possible triggers: stress, exposures, gut, nutrition",
          "Works on possible causes, so that less may be needed later",
        ],
      },
      exampleTag: "A simple example",
      exampleTitle: "Two people, high blood pressure: 150 over 95.",
      exampleSub:
        "Deliberately kept simple so the principle is clear. In practice I look at much more complex connections, not just blood pressure.",
      readingLabel: "Same reading",
      reveal: "What is behind it?",
      persons: [
        {
          id: "A",
          name: "Person A",
          tag: "45, a lot of responsibility",
          reading: "150 / 95",
          cause:
            "Behind it there can be chronic stress, old trauma and lifestyle, meaning sleep, nutrition and movement. That is exactly where we work together.",
        },
        {
          id: "B",
          name: "Person B",
          tag: "52, often tired",
          reading: "150 / 95",
          cause:
            "Here burdens from toxins, heavy metals, mould, parasites or environmental factors can play a part. We look at detoxification, the gut and your environment.",
        },
      ],
      bridge:
        "The value is kept in view for both. But what drives it can be completely different, and that is exactly what changes the plan. I do not replace conventional medicine, I think it further.",
    },
    fuerwen: {
      tag: "Who it is for",
      h2a: "And even without a diagnosis, ",
      h2em: "exactly right",
      h2b: ".",
      lead:
        "Many people come with a clear concern. Just as many come with a feeling: something is off, I just do not know what. Both belong here.",
      cards: [
        { ic: "magnifier", t: "Symptoms without a clear cause", p: "You have symptoms, but so far no one has found the common thread." },
        { ic: "layers", t: "Open to a second view", p: "You would like your values and symptoms understood from a different angle." },
        { ic: "shield", t: "Staying well before things tip over", p: "You feel good and want to steer early, instead of waiting until something hurts." },
        { ic: "help", t: "Simply seeing what is possible", p: "You have no specific concern and want to know how I could help you at all." },
      ],
      foot:
        "You do not have to be ill to come. A conversation is enough to see what is possible.",
    },
    themen: {
      tag: "Common topics",
      h2a: "What people ",
      h2em: "come to me with",
      h2b: ".",
      lead:
        "Many people arrive without a finished diagnosis, but with symptoms that have been hard to make sense of so far. Here you find examples of the topics people come to my practice with and that we look into together.",
      cats: [
        { ic: "droplet", t: "Hormones & cycle", items: ["Estrogen dominance and progesterone deficiency", "PCOS (polycystic ovary syndrome)", "Endometriosis", "Menopausal symptoms (perimenopause and menopause)", "Male testosterone deficiency", "Premenstrual syndrome and PMDD", "Unfulfilled desire to have children"] },
        { ic: "stomach", t: "Gut, digestion & intolerances", items: ["Irritable bowel syndrome (IBS)", "Digestive problems (bloating, fullness)", "Small intestinal bacterial overgrowth (SIBO)", "Leaky gut and gut dysbiosis", "Food intolerances (lactose, fructose, gluten)", "Chronic reflux and heartburn"] },
        { ic: "brain", t: "Mind, trauma & sleep", items: ["Burnout", "Depression and mood swings", "Trauma and post-traumatic stress disorder (PTSD)", "Anxiety disorders and panic attacks", "Sleep problems (trouble falling and staying asleep)", "Adult ADHD", "Inner restlessness and irritability"] },
        { ic: "bolt", t: "Exhaustion, energy & longevity", items: ["ME/CFS (chronic fatigue syndrome)", "Long Covid and post-Covid syndrome", "Mitochondrial dysfunction (energy metabolism)", "Nutrient-related fatigue (iron, vitamin D, B12)", "Adrenal dysfunction and disrupted cortisol rhythm", "POTS and orthostatic intolerance", "Accelerated cellular aging (longevity)"] },
        { ic: "heart", t: "Metabolism, blood sugar & cardiovascular", items: ["Type 2 diabetes and prediabetes", "Insulin resistance", "Metabolic syndrome", "High blood pressure (hypertension)", "High cholesterol (dyslipidemia)", "Non-alcoholic fatty liver disease (NAFLD)", "Stubborn weight gain and visceral fat"] },
        { ic: "shield", t: "Immune system, autoimmune & environment", items: ["Autoimmune diseases (e.g. Hashimoto's, rheumatoid arthritis, lupus)", "Mast cell activation (MCAS)", "Histamine intolerance", "Chronic low-grade inflammation (silent inflammation)", "Recurrent infections and weakened immune defense", "Heavy metal exposure (e.g. lead, mercury)", "Mold and mycotoxin exposure (CIRS)"] },
      ],
      foot:
        "You do not see yourself exactly here, or you do not have a clear diagnosis yet? Even then it is worth talking, because the path often begins with exactly the questions that have stayed open.",
    },
    spektrum: {
      tag: "Health is a spectrum",
      h2a: "Not a fixed state, ",
      h2em: "but aliveness",
      h2b: ".",
      lead:
        "Health is not simply the absence of a diagnosis. It is a spectrum. It is not about just barely functioning, but about being truly alive. Where are you right now?",
      levels: [
        { pct: 30, label: "Surviving", title: "You function, nothing more", text: "No clear finding, and still little energy. You get through the day, but it does not feel like you." },
        { pct: 60, label: "Functioning", title: "Daily life runs", text: "A lot is fine, but something is missing: sleep, focus, drive, lightness. There is more possible." },
        { pct: 100, label: "Aliveness", title: "Awake, clear, resilient", text: "Not just free of symptoms, but full of energy. That is the goal we can work towards together." },
      ],
      markerNote:
        "That is why I do not look at a single value, but, depending on the question, at 40 to 120 markers.",
      diagCta: "More about diagnostics",
    },
    ablauf: {
      tag: "How it works",
      h2a: "Consultation, diagnostics, ",
      h2em: "your first plan",
      h2b: ".",
      steps: [
        { step: "01", ic: "ear", name: "Consultation", text: "30 minutes of space for your symptoms, your story, your biography. I take your experience seriously, even when a report does not yet explain it." },
        { step: "02", ic: "magnifier", name: "Meaningful diagnostics", text: "I order exactly the tests that will really change your next steps. No tests for the sake of tests." },
        { step: "03", ic: "target", name: "Your first plan", text: "You leave with a clear first roadmap, tailored to you and thought through across the medical fields." },
      ],
    },
    diagnostik: {
      tag: "Diagnostics",
      h2a: "Tests that give ",
      h2em: "answers",
      h2b: ".",
      lead:
        "Good diagnostics often go beyond the standard lab. I combine what fits your question, and explain every step to you beforehand.",
      cards: [
        { ic: "droplet", t: "Blood", p: "Comprehensive lab values, including nutrients and markers that are often missing in a standard check." },
        { ic: "stomach", t: "Stool", p: "A look at the gut flora and digestion, often an underestimated key." },
        { ic: "flask", t: "Urine", p: "Clues about metabolism and possible burdens on the body." },
        { ic: "bolt", t: "Stress and load", p: "Markers around stress and recovery, to see what your system is dealing with right now." },
      ],
      foot:
        "Which tests make sense we decide together, transparently and step by step. Much of it can also be started conveniently from home.",
      cta: "Go to diagnostics",
    },
    online: {
      tag: "Available online",
      h2a: "The whole consultation, ",
      h2em: "by video too",
      h2b: ".",
      lead:
        "Where you live should not matter. The first conversation, the results review and the plan work just as well online, securely by video, at the same price as at the practice.",
      steps: [
        { step: "01", ic: "video", name: "Video conversation", text: "We start with the first conversation by secure video call, comfortably from home." },
        { step: "02", ic: "droplet", name: "Fitting diagnostics", text: "I order the tests. Stool and urine work from home, the blood draw you do locally or at a lab near you." },
        { step: "03", ic: "file", name: "Results and plan", text: "We go through your results and your first plan together by video." },
      ],
      foot:
        "This way you get the same consultation, whether you are in Berlin, in Hamburg or abroad.",
    },
    plan: {
      tag: "A possible plan",
      h2a: "What your ",
      h2em: "plan",
      h2b: " could look like.",
      lead:
        "Your plan grows out of the consultation and the diagnostics. It may draw on several disciplines, always in the way that fits you. Tap a pillar.",
      pillars: [
        { ic: "heart", name: "Lifestyle", text: "Everyday life is the strongest medicine.", methods: ["Nutrition changes", "Breath therapy", "Movement optimisation"] },
        { ic: "droplet", name: "Detoxification", text: "Relieving the body where it is burdened.", methods: ["Elimination and detox strategies", "for example via infusions"] },
        { ic: "leaf", name: "Plant remedies", text: "Plant-based remedies, used precisely.", methods: ["Plant remedies from anthroposophic medicine"] },
        { ic: "pill", name: "Nutrient therapy", text: "Filling what is missing.", methods: ["Based on orthomolecular medicine", "As tablets or as an infusion"] },
        { ic: "brain", name: "Psyche", text: "Body and mind belong together.", methods: ["Psychotherapy with Somatic Experiencing", "Ketamine-assisted infusions"] },
      ],
    },
    kosten: {
      tag: "Cost",
      h2a: "Transparent, ",
      h2em: "no surprises",
      h2b: ".",
      priceTag: "First consultation",
      priceName: "30 minute consultation",
      priceAmount: "€100",
      priceNote:
        "Online by video or at the practice in Berlin, at the same price. Longer appointments are possible, we agree on the scope beforehand.",
      valueTitle: "Always included:",
      value: [
        "An interdisciplinary look at all of your symptoms",
        "Recommendation and ordering of the fitting diagnostics",
        "A concrete first plan to take with you",
        "Time and real listening, without rushing",
      ],
      note:
        "The consultation is a private self-pay service. The cost of any diagnostics depends on the scope and I always discuss it with you beforehand.",
    },
    closing: {
      h2a: "Ready for a ",
      h2em: "different view",
      h2b: "?",
      p: "Book your first conversation, online by video or at the practice in Berlin. Together we look at what could be behind your symptoms.",
      cta: "Book an appointment",
      addr: "ViveCura · Berlin · online and on site",
    },
  },
};

/* ---------------- Komponente ---------------- */
export default function Beratung() {
  const lang = useLanguage();
  const c = CONTENT[lang] || CONTENT.de;
  const ref = useRef(null);
  const [openPerson, setOpenPerson] = useState({});
  const [specIdx, setSpecIdx] = useState(1);
  const [pillarIdx, setPillarIdx] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, [lang]);

  const togglePerson = (id) => setOpenPerson((s) => ({ ...s, [id]: !s[id] }));

  const spec = c.spektrum.levels[specIdx];
  const pillar = c.plan.pillars[pillarIdx];

  return (
    <div className="ber" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: BER_CSS }} />

      {/* Hero */}
      <header className="hero">
        <div className="wrap">
          <span className="eyebrow"><span className="dot" />{c.hero.eyebrow}</span>
          <h1 className="hero-h">{c.hero.h1a}<em>{c.hero.h1em}</em>{c.hero.h1b}</h1>
          <p className="hero-sub">{c.hero.sub}</p>
          <div className="usp-band">
            <div className="usp-strike">{c.hero.strike}</div>
            <div className="usp-plan">{c.hero.planPre}<b>{c.hero.planB}</b>{c.hero.planPost}</div>
          </div>
          <div className="hero-actions">
            <a className="btn btn-primary" href={BOOK} target="_blank" rel="noreferrer">{c.hero.cta} <ARROW /></a>
            <a className="btn btn-ghost" href="#kosten">{c.hero.ghost}</a>
          </div>
          <div className="hero-price">{c.hero.priceNote}</div>
        </div>
      </header>

      {/* Subnav */}
      <nav className="subnav">
        <div className="wrap">
          {c.subnav.map((n) => (
            <a key={n.to} href={`#${n.to}`}>{n.label}</a>
          ))}
        </div>
      </nav>

      {/* Der Unterschied */}
      <section className="sec vergleich" id="vergleich">
        <div className="wrap">
          <span className="sec-tag">{c.vergleich.tag}</span>
          <h2 className="sec-h">{c.vergleich.h2a}<em>{c.vergleich.h2em}</em>{c.vergleich.h2b}</h2>
          <p className="sec-lead">{c.vergleich.lead}</p>

          <div className="compare-grid">
            <div className="compare-col classic">
              <div className="cc-title">{c.vergleich.classic.title}</div>
              <ul>
                {c.vergleich.classic.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="compare-col holistic">
              <div className="cc-title">{c.vergleich.holistic.title}</div>
              <ul>
                {c.vergleich.holistic.points.map((p, i) => (
                  <li key={i}><span className="cc-check"><CHECK /></span>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interaktives Beispiel: Blutdruck */}
          <div className="example">
            <span className="ex-tag">{c.vergleich.exampleTag}</span>
            <div className="ex-title">{c.vergleich.exampleTitle}</div>
            <div className="ex-sub">{c.vergleich.exampleSub}</div>
            <div className="person-grid">
              {c.vergleich.persons.map((p) => (
                <div className={`person-card${openPerson[p.id] ? " open" : ""}`} key={p.id}>
                  <div className="person-top">
                    <div>
                      <div className="person-name">{p.name}</div>
                      <div className="person-tag">{p.tag}</div>
                    </div>
                    <div className="person-reading">
                      <span className="pr-label">{c.vergleich.readingLabel}</span>
                      <span className="pr-val">{p.reading}</span>
                    </div>
                  </div>
                  <button className="person-btn" type="button" onClick={() => togglePerson(p.id)}>
                    {c.vergleich.reveal}<span className="pb-chev"><CHEV /></span>
                  </button>
                  <div className="person-cause"><div className="person-cause-in">{p.cause}</div></div>
                </div>
              ))}
            </div>
            <div className="ex-bridge">{c.vergleich.bridge}</div>
          </div>
        </div>
      </section>

      {/* Für wen */}
      <section className="sec fuerwen" id="fuerwen">
        <div className="wrap">
          <span className="sec-tag">{c.fuerwen.tag}</span>
          <h2 className="sec-h">{c.fuerwen.h2a}<em>{c.fuerwen.h2em}</em>{c.fuerwen.h2b}</h2>
          <p className="sec-lead">{c.fuerwen.lead}</p>
          <div className="cardgrid four">
            {c.fuerwen.cards.map((card, i) => (
              <div className="card" key={i}>
                <div className="ic">{IC[card.ic]()}</div>
                <h4>{card.t}</h4>
                <p>{card.p}</p>
              </div>
            ))}
          </div>
          <div className="sec-foot">{c.fuerwen.foot}</div>
        </div>
      </section>

      {/* Themen: Diagnosen und Symptome */}
      <section className="sec themen" id="themen">
        <div className="wrap">
          <span className="sec-tag">{c.themen.tag}</span>
          <h2 className="sec-h">{c.themen.h2a}<em>{c.themen.h2em}</em>{c.themen.h2b}</h2>
          <p className="sec-lead">{c.themen.lead}</p>
          <div className="themen-grid">
            {c.themen.cats.map((cat, i) => (
              <div className="tcard" key={i}>
                <div className="tcard-head">
                  <span className="tcard-ic">{IC[cat.ic]()}</span>
                  <div className="tcard-title">{cat.t}</div>
                </div>
                <ul>
                  {cat.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="sec-foot">{c.themen.foot}</div>
        </div>
      </section>

      {/* Gesundheit ist ein Spektrum */}
      <section className="sec spektrum" id="spektrum">
        <div className="wrap">
          <span className="sec-tag">{c.spektrum.tag}</span>
          <h2 className="sec-h">{c.spektrum.h2a}<em>{c.spektrum.h2em}</em>{c.spektrum.h2b}</h2>
          <p className="sec-lead">{c.spektrum.lead}</p>

          <div className="spec">
            <div className="spec-levels">
              {c.spektrum.levels.map((lv, i) => (
                <button
                  key={i}
                  type="button"
                  className={`spec-btn${i === specIdx ? " active" : ""}`}
                  onClick={() => setSpecIdx(i)}
                >
                  {lv.label}
                </button>
              ))}
            </div>
            <div className="spec-bar"><div className="spec-fill" style={{ width: `${spec.pct}%` }} /></div>
            <div className="spec-panel">
              <div className="spec-pct">{spec.pct}%</div>
              <div className="spec-head">
                <div className="spec-ptitle">{spec.title}</div>
                <div className="spec-ptext">{spec.text}</div>
              </div>
            </div>
            <div className="spec-note">
              <span>{c.spektrum.markerNote}</span>
              <a className="btn btn-ghost" href={c.diagHref}>{c.spektrum.diagCta} <ARROW /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="sec ablauf" id="ablauf">
        <div className="wrap">
          <span className="sec-tag">{c.ablauf.tag}</span>
          <h2 className="sec-h">{c.ablauf.h2a}<em>{c.ablauf.h2em}</em>{c.ablauf.h2b}</h2>
          <div className="stepgrid">
            {c.ablauf.steps.map((m, i) => (
              <div className="mcard" key={i}>
                <div className="step">{m.step}</div>
                <div className="mic">{IC[m.ic]()}</div>
                <h4>{m.name}</h4>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnostik */}
      <section className="sec diagnostik" id="diagnostik">
        <div className="wrap">
          <span className="sec-tag">{c.diagnostik.tag}</span>
          <h2 className="sec-h">{c.diagnostik.h2a}<em>{c.diagnostik.h2em}</em>{c.diagnostik.h2b}</h2>
          <p className="sec-lead">{c.diagnostik.lead}</p>
          <div className="cardgrid four">
            {c.diagnostik.cards.map((card, i) => (
              <div className="card" key={i}>
                <div className="ic">{IC[card.ic]()}</div>
                <h4>{card.t}</h4>
                <p>{card.p}</p>
              </div>
            ))}
          </div>
          <div className="sec-foot">{c.diagnostik.foot}</div>
          <div className="sec-cta"><a className="btn btn-ghost" href={c.diagHref}>{c.diagnostik.cta} <ARROW /></a></div>
        </div>
      </section>

      {/* Online */}
      <section className="sec online" id="online">
        <div className="wrap">
          <span className="sec-tag">{c.online.tag}</span>
          <h2 className="sec-h">{c.online.h2a}<em>{c.online.h2em}</em>{c.online.h2b}</h2>
          <p className="sec-lead">{c.online.lead}</p>
          <div className="stepgrid">
            {c.online.steps.map((m, i) => (
              <div className="mcard" key={i}>
                <div className="step">{m.step}</div>
                <div className="mic">{IC[m.ic]()}</div>
                <h4>{m.name}</h4>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <div className="sec-foot">{c.online.foot}</div>
        </div>
      </section>

      {/* Dein Plan (interaktive Saeulen) */}
      <section className="sec plan" id="plan">
        <div className="wrap">
          <span className="sec-tag">{c.plan.tag}</span>
          <h2 className="sec-h">{c.plan.h2a}<em>{c.plan.h2em}</em>{c.plan.h2b}</h2>
          <p className="sec-lead">{c.plan.lead}</p>

          <div className="pillars">
            <div className="pillar-tabs">
              {c.plan.pillars.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pillar-tab${i === pillarIdx ? " active" : ""}`}
                  onClick={() => setPillarIdx(i)}
                >
                  <span className="pic">{IC[p.ic]()}</span>
                  <span className="pname">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="pillar-panel">
              <h4>{pillar.name}</h4>
              <p className="pp-text">{pillar.text}</p>
              <ul>
                {pillar.methods.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Kosten */}
      <section className="sec kosten" id="kosten">
        <div className="wrap">
          <span className="sec-tag">{c.kosten.tag}</span>
          <h2 className="sec-h">{c.kosten.h2a}<em>{c.kosten.h2em}</em>{c.kosten.h2b}</h2>
          <div className="kosten-grid">
            <div className="price-card">
              <span className="pc-tag">{c.kosten.priceTag}</span>
              <div className="pc-name">{c.kosten.priceName}</div>
              <div className="pc-amount">{c.kosten.priceAmount}</div>
              <p className="pc-note">{c.kosten.priceNote}</p>
            </div>
            <div className="value-box">
              <div className="value-title">{c.kosten.valueTitle}</div>
              <ul className="value-list">
                {c.kosten.value.map((v, i) => (
                  <li key={i}><CHECK /><span>{v}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="kosten-note"><span className="kn-ic"><IC.leaf /></span><span>{c.kosten.note}</span></div>
        </div>
      </section>

      {/* Closing */}
      <section className="closing">
        <div className="wrap">
          <h2>{c.closing.h2a}<em>{c.closing.h2em}</em>{c.closing.h2b}</h2>
          <p>{c.closing.p}</p>
          <a className="btn btn-white" href={BOOK} target="_blank" rel="noreferrer">{c.closing.cta} <ARROW /></a>
          <div className="addr">{c.closing.addr}</div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Gekapseltes CSS (alle Regeln unter .ber) ---------------- */
const BER_CSS = `
.ber{
  --teal:#43a9ab;--teal-dark:#2d8789;--teal-darker:#1f6e70;--teal-pale:#e0f4f5;--teal-subtle:#f3faf9;
  --charcoal:#1a1f24;--gray:#515757;--gray-soft:#8a9a9a;--line:#e2eeee;--cream:#f5f3ed;
  --sans:var(--font-plus-jakarta),system-ui,sans-serif;--serif:var(--font-libre-baskerville),Georgia,serif;
  --ease:cubic-bezier(.22,1,.36,1);--spring:cubic-bezier(.34,1.4,.5,1);
  font-family:var(--sans);color:var(--charcoal);line-height:1.6;-webkit-font-smoothing:antialiased;background:#fff;overflow-x:hidden;
}
.ber *{box-sizing:border-box}
.ber .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.ber .btn{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:1rem;padding:15px 28px;border-radius:100px;text-decoration:none;cursor:pointer;border:none;transition:.3s var(--ease)}
.ber .btn-primary{color:#fff;background:var(--teal);box-shadow:0 14px 32px -14px rgba(67,169,171,.8)}
.ber .btn-primary:hover{background:var(--teal-dark);transform:translateY(-2px)}
.ber .btn-ghost{color:var(--teal-darker);background:#fff;border:1.5px solid var(--line)}
.ber .btn-ghost:hover{border-color:var(--teal);background:var(--teal-subtle)}
.ber .btn-white{background:#fff;color:var(--teal-darker)}
.ber .btn-white:hover{background:var(--cream);transform:translateY(-2px)}
.ber .arrow{transition:transform .3s var(--ease)}
.ber .btn-primary:hover .arrow,.ber .btn-white:hover .arrow,.ber .btn-ghost:hover .arrow{transform:translateX(4px)}

.ber .hero{position:relative;padding:70px 0 56px;overflow:hidden;background:radial-gradient(120% 90% at 86% -10%,var(--teal-pale) 0%,rgba(224,244,245,0) 55%),radial-gradient(90% 70% at -5% 110%,var(--teal-subtle) 0%,rgba(243,250,249,0) 60%)}
.ber .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-darker);background:#fff;border:1.5px solid var(--line);padding:8px 16px;border-radius:100px}
.ber .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.ber .hero-h{font-size:clamp(2.4rem,5.6vw,4.2rem);line-height:1.03;letter-spacing:-.035em;font-weight:800;margin:24px 0 0;max-width:17ch}
.ber .hero-h em{font-family:var(--serif);font-weight:400;font-style:italic;color:var(--teal-darker)}
.ber .hero-sub{font-size:clamp(1.05rem,1.6vw,1.25rem);color:var(--gray);max-width:56ch;margin:24px 0 0}
.ber .usp-band{margin:30px 0 0;border-left:3px solid var(--teal);padding:4px 0 4px 20px}
.ber .usp-strike{font-family:var(--serif);font-style:italic;font-size:1.08rem;color:var(--gray-soft);text-decoration:line-through;text-decoration-thickness:1.5px}
.ber .usp-plan{font-family:var(--serif);font-style:italic;font-size:1.5rem;color:var(--charcoal);margin-top:3px}
.ber .usp-plan b{font-style:normal;font-weight:700;color:var(--teal-darker)}
.ber .hero-actions{margin:36px 0 0;display:flex;flex-wrap:wrap;gap:13px}
.ber .hero-price{margin-top:18px;font-size:.95rem;font-weight:600;color:var(--teal-darker)}

.ber .subnav{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.ber .subnav .wrap{display:flex;gap:8px;flex-wrap:wrap;padding:14px 24px;justify-content:center}
.ber .subnav a{font-size:.86rem;font-weight:600;color:var(--gray);text-decoration:none;padding:8px 15px;border-radius:100px;border:1px solid var(--line);background:#fff;transition:.25s var(--ease);white-space:nowrap;cursor:pointer}
.ber .subnav a:hover{color:var(--teal-darker);border-color:var(--teal);background:var(--teal-subtle)}

.ber .sec{padding:74px 0;scroll-margin-top:70px}
.ber .sec-tag{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px}
.ber .sec-h{font-size:clamp(2rem,3.7vw,2.9rem);line-height:1.07;letter-spacing:-.03em;font-weight:800;max-width:22ch;margin:0}
.ber .sec-h em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal-darker)}
.ber .sec-lead{font-size:1.12rem;color:var(--gray);max-width:62ch;margin-top:16px}
.ber .sec-foot{margin-top:30px;font-family:var(--serif);font-style:italic;font-size:1.02rem;color:var(--gray);max-width:66ch;border-left:3px solid var(--teal-pale);padding-left:18px}
.ber .sec-cta{margin-top:26px}

.ber .vergleich{background:#fff}
.ber .compare-grid{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:760px){.ber .compare-grid{grid-template-columns:1fr}}
.ber .compare-col{border:1px solid var(--line);border-radius:22px;padding:30px 28px;background:#fff}
.ber .compare-col.holistic{border-color:var(--teal);background:var(--teal-subtle);box-shadow:0 30px 64px -44px rgba(31,110,112,.55)}
.ber .cc-title{font-size:1.25rem;font-weight:800;letter-spacing:-.02em;margin:0 0 16px}
.ber .compare-col.holistic .cc-title{color:var(--teal-darker)}
.ber .compare-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ber .compare-col li{display:flex;align-items:flex-start;gap:11px;font-size:.98rem;color:var(--gray);line-height:1.5}
.ber .compare-col.classic li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--gray-soft);margin-top:8px}
.ber .cc-check{color:var(--teal);flex:none;display:flex;margin-top:1px}

.ber .example{margin-top:26px;background:var(--charcoal);color:#fff;border-radius:24px;padding:34px 34px;position:relative;overflow:hidden}
.ber .example::before{content:"";position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(67,169,171,.20),transparent 68%);top:-130px;right:-80px}
.ber .ex-tag{position:relative;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);display:inline-block;margin-bottom:10px}
.ber .ex-title{position:relative;font-size:clamp(1.3rem,2.4vw,1.7rem);font-weight:800;letter-spacing:-.02em;line-height:1.2;max-width:26ch}
.ber .ex-sub{position:relative;margin-top:12px;font-size:1rem;color:rgba(255,255,255,.72);line-height:1.6;max-width:64ch}
.ber .person-grid{position:relative;margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:680px){.ber .person-grid{grid-template-columns:1fr}}
.ber .person-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:22px 22px;transition:.35s var(--ease)}
.ber .person-card.open{border-color:var(--teal);background:rgba(67,169,171,.1)}
.ber .person-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.ber .person-name{font-size:1.1rem;font-weight:700;color:#fff}
.ber .person-tag{font-size:.85rem;color:rgba(255,255,255,.6);margin-top:2px}
.ber .person-reading{text-align:right;flex:none}
.ber .pr-label{display:block;font-size:.64rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.ber .pr-val{display:block;font-family:var(--serif);font-size:1.35rem;color:var(--teal);margin-top:2px}
.ber .person-btn{margin-top:18px;display:inline-flex;align-items:center;gap:8px;font-family:var(--sans);font-size:.9rem;font-weight:600;color:var(--teal);background:transparent;border:1px solid rgba(67,169,171,.5);border-radius:100px;padding:9px 17px;cursor:pointer;transition:.3s var(--ease)}
.ber .person-btn:hover{background:rgba(67,169,171,.14)}
.ber .pb-chev{display:flex;transition:transform .4s var(--spring)}
.ber .person-card.open .pb-chev{transform:rotate(180deg)}
.ber .person-cause{max-height:0;overflow:hidden;transition:max-height .5s var(--ease)}
.ber .person-card.open .person-cause{max-height:320px}
.ber .person-cause-in{padding-top:16px;font-size:.96rem;color:rgba(255,255,255,.82);line-height:1.62}
.ber .ex-bridge{position:relative;margin-top:26px;padding-top:22px;border-top:1px solid rgba(255,255,255,.14);font-family:var(--serif);font-style:italic;font-size:1.08rem;color:#fff;line-height:1.6;max-width:72ch}

.ber .fuerwen{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ber .cardgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.ber .cardgrid.four{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:980px){.ber .cardgrid.four{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.ber .cardgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.ber .cardgrid,.ber .cardgrid.four{grid-template-columns:1fr}}
.ber .card{border:1px solid var(--line);border-radius:20px;padding:26px 24px;background:#fff;transition:.4s var(--ease)}
.ber .card:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 28px 56px -40px rgba(31,110,112,.5)}
.ber .card .ic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:16px}
.ber .card h4{font-size:1.1rem;font-weight:700;letter-spacing:-.01em;margin:0}
.ber .card p{font-size:.92rem;color:var(--gray);line-height:1.6;margin-top:8px;overflow-wrap:break-word}

.ber .themen{background:#fff}
.ber .themen-grid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:900px){.ber .themen-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.ber .themen-grid{grid-template-columns:1fr}}
.ber .tcard{border:1px solid var(--line);border-radius:20px;padding:24px 22px;background:#fff;transition:.4s var(--ease)}
.ber .tcard:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 24px 50px -38px rgba(31,110,112,.5)}
.ber .tcard-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.ber .tcard-ic{width:42px;height:42px;border-radius:12px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;flex:none}
.ber .tcard-title{font-size:1.05rem;font-weight:700;letter-spacing:-.01em}
.ber .tcard ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ber .tcard li{font-size:.85rem;color:var(--gray);background:var(--teal-subtle);border:1px solid var(--line);border-radius:100px;padding:6px 13px;line-height:1.3}

.ber .spektrum{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.ber .spec{margin-top:40px}
.ber .spec-levels{display:flex;gap:10px;flex-wrap:wrap}
.ber .spec-btn{font-family:var(--sans);font-size:.92rem;font-weight:600;color:var(--gray);background:#fff;border:1px solid var(--line);border-radius:100px;padding:10px 20px;cursor:pointer;transition:.3s var(--ease)}
.ber .spec-btn:hover{border-color:var(--teal)}
.ber .spec-btn.active{color:#fff;background:var(--teal);border-color:var(--teal)}
.ber .spec-bar{margin-top:22px;height:14px;border-radius:100px;background:var(--teal-pale);overflow:hidden}
.ber .spec-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--teal),var(--teal-darker));transition:width .6s var(--spring)}
.ber .spec-panel{margin-top:24px;display:flex;gap:22px;align-items:center}
.ber .spec-pct{font-family:var(--serif);font-size:3rem;line-height:1;color:var(--teal-darker);flex:none}
.ber .spec-head{flex:1;min-width:0}
.ber .spec-ptitle{font-size:1.2rem;font-weight:800;color:var(--charcoal)}
.ber .spec-ptext{font-size:1rem;color:var(--gray);line-height:1.6;margin-top:6px;max-width:62ch}
.ber .spec-note{margin-top:26px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 22px}
.ber .spec-note>span{font-size:1rem;color:var(--gray);line-height:1.55;flex:1;min-width:240px}

.ber .ablauf{background:#fff}
.ber .online{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ber .stepgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:800px){.ber .stepgrid{grid-template-columns:1fr}}
.ber .mcard{border:1px solid var(--line);border-radius:20px;padding:28px 24px;background:#fff;transition:.4s var(--ease);position:relative}
.ber .mcard:hover{border-color:var(--teal);transform:translateY(-5px);box-shadow:0 28px 56px -40px rgba(31,110,112,.6)}
.ber .mcard .step{font-family:var(--serif);font-size:1.6rem;color:var(--teal-pale);position:absolute;top:16px;right:22px}
.ber .mcard .mic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:16px}
.ber .mcard h4{font-size:1.12rem;font-weight:700;margin:0}
.ber .mcard p{font-size:.93rem;color:var(--gray);margin-top:10px;line-height:1.6}

.ber .diagnostik{background:linear-gradient(180deg,var(--teal-subtle),#fff)}

.ber .plan{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ber .pillars{margin-top:44px}
.ber .pillar-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
@media(max-width:820px){.ber .pillar-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:520px){.ber .pillar-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ber .pillar-tab{border:1px solid var(--line);border-radius:16px;padding:20px 12px;background:#fff;cursor:pointer;text-align:center;transition:.3s var(--ease);display:flex;flex-direction:column;align-items:center;gap:11px}
.ber .pillar-tab:hover{border-color:var(--teal);transform:translateY(-3px)}
.ber .pillar-tab.active{border-color:var(--teal);background:var(--teal-subtle);box-shadow:0 22px 46px -34px rgba(31,110,112,.6)}
.ber .pillar-tab .pic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center}
.ber .pillar-tab.active .pic{background:var(--teal);color:#fff}
.ber .pillar-tab .pname{font-size:.95rem;font-weight:700;color:var(--charcoal);line-height:1.2}
.ber .pillar-panel{margin-top:16px;border:1px solid var(--teal);background:var(--teal-subtle);border-radius:20px;padding:30px 32px}
.ber .pillar-panel h4{font-size:1.35rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px;color:var(--teal-darker)}
.ber .pillar-panel .pp-text{font-family:var(--serif);font-style:italic;font-size:1.06rem;color:var(--gray);margin:0 0 16px}
.ber .pillar-panel ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px}
.ber .pillar-panel li{display:inline-flex;align-items:center;gap:9px;font-size:.95rem;color:var(--charcoal);background:#fff;border:1px solid var(--line);border-radius:100px;padding:9px 17px}
.ber .pillar-panel li::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--teal);flex:none}

.ber .kosten{background:var(--teal-subtle)}
.ber .kosten-grid{margin-top:44px;display:grid;grid-template-columns:1fr 1.2fr;gap:18px;align-items:start}
@media(max-width:760px){.ber .kosten-grid{grid-template-columns:1fr}}
.ber .price-card{border:1px solid var(--line);border-radius:22px;padding:32px 30px;background:#fff}
.ber .pc-tag{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin-bottom:10px}
.ber .pc-name{font-size:1.1rem;font-weight:700;color:var(--charcoal)}
.ber .pc-amount{font-family:var(--serif);font-size:3rem;line-height:1;letter-spacing:-.02em;color:var(--teal-darker);margin:12px 0 14px}
.ber .pc-note{font-size:.92rem;color:var(--gray);line-height:1.6;margin:0}
.ber .value-box{background:#fff;border:1px solid var(--line);border-radius:22px;padding:30px 30px}
.ber .value-title{font-weight:700;font-size:1.05rem;color:var(--charcoal);margin-bottom:16px}
.ber .value-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:13px}
.ber .value-list li{display:flex;align-items:flex-start;gap:12px;font-size:.98rem;color:var(--gray);line-height:1.5}
.ber .value-list li svg{color:var(--teal);flex:none;margin-top:2px}
.ber .kosten-note{margin-top:20px;font-size:.96rem;color:var(--gray);background:#fff;border:1px dashed var(--teal);border-radius:16px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start;line-height:1.6;max-width:76ch}
.ber .kosten-note .kn-ic{color:var(--teal);flex:none;margin-top:1px;display:flex}

.ber .closing{background:linear-gradient(160deg,var(--teal-darker),var(--teal-dark) 55%,var(--teal));color:#fff;position:relative;overflow:hidden}
.ber .closing .wrap{text-align:center;padding:92px 24px}
.ber .closing h2{font-size:clamp(2rem,3.8vw,3rem);font-weight:800;letter-spacing:-.03em;margin:0}
.ber .closing h2 em{font-family:var(--serif);font-style:italic;font-weight:400}
.ber .closing p{color:rgba(255,255,255,.86);margin:18px auto 0;max-width:54ch;font-size:1.08rem}
.ber .closing .btn-white{margin-top:34px}
.ber .closing .addr{margin-top:30px;font-size:.94rem;color:rgba(255,255,255,.82)}

@media(max-width:600px){
  .ber .sec{padding:50px 0}
  .ber .wrap{padding:0 18px}
  .ber .hero{padding:84px 0 38px}
  .ber .hero-sub{font-size:1.05rem}
  .ber .usp-plan{font-size:1.28rem}
  .ber .hero-actions{gap:10px}
  .ber .hero-actions .btn{width:100%;justify-content:center}
  .ber .subnav{position:static}
  .ber .subnav .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:14px 16px}
  .ber .subnav a{padding:10px 8px;font-size:.78rem;line-height:1.2;text-align:center;white-space:normal;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:center}
  .ber .sec-h{font-size:clamp(1.7rem,7vw,2.1rem)}
  .ber .sec-lead{font-size:1.04rem}
  .ber .cardgrid{margin-top:30px;gap:14px}
  .ber .card,.ber .mcard{padding:22px 20px}
  .ber .compare-col{padding:26px 22px}
  .ber .example{padding:26px 22px;border-radius:20px}
  .ber .spec-panel{gap:16px}
  .ber .spec-pct{font-size:2.4rem}
  .ber .pillar-panel{padding:24px 22px}
  .ber .price-card,.ber .value-box{padding:26px 22px}
  .ber .pc-amount{font-size:2.6rem}
  .ber .closing .wrap{padding:66px 20px}
}
@media(max-width:380px){
  .ber .wrap{padding:0 15px}
  .ber .hero-h{font-size:2.15rem}
  .ber .sec-h{font-size:1.6rem}
}
`;
