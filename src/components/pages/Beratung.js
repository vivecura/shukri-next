"use client";

/**
 * Ganzheitliche Beratung. Bereich /beratung (EN /en/consultations), ViveCura Berlin.
 * Stil & CSS-System wie /eiseninfusion (gekapselt unter .ber, kein Leaken).
 * Wiederverwendete Bausteine: <MeinAnsatz/> (interaktives Kreis-Diagramm) + <SchwerpunkteGrid/> (Bild-Klappkarten).
 * STIL: Du-Anrede, keine Gedankenstriche im Fließtext, kann-Form (kein Heilversprechen),
 *       sowohl-als-auch statt Abwertung der Kollegen (Anwalts-Gate).
 * PREIS: 30 Minuten Beratung 100 EUR, online zum selben Preis wie in der Praxis.
 */

import { useEffect, useRef, useState } from "react";
import useLanguage from "@/hooks/useLanguage";
import MeinAnsatz from "@/components/MeinAnsatz";
import SchwerpunkteGrid from "@/components/SchwerpunkteGrid";

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
    hero: {
      eyebrow: "Ganzheitliche Beratung · Berlin & online",
      h1a: "Ein Blick auf dich, ",
      h1em: "der weitergeht",
      h1b: " als der Befund.",
      sub:
        "In 30 Minuten schauen wir gemeinsam auf deine ganze Geschichte: Beschwerden, Werte, Lebensstil. Ich denke über die Fachgrenzen hinweg, sortiere die Komplexität, und du gehst mit einem konkreten ersten Plan wieder raus. Online per Video oder bei mir in der Praxis in Berlin.",
      strike: "Nur den einen Wert senken, der auffällt.",
      planPre: "Verstehen, ",
      planB: "was dahintersteckt",
      planPost: ".",
      priceNote: "30 Minuten für 100 €. Online wie in der Praxis.",
      cta: "Termin buchen",
      ghost: "Was kostet das?",
    },
    subnav: [
      { to: "fuerwen", label: "Für wen" },
      { to: "vergleich", label: "Der Unterschied" },
      { to: "mehrblick", label: "Mehrblick" },
      { to: "ablauf", label: "Ablauf" },
      { to: "diagnostik", label: "Diagnostik" },
      { to: "online", label: "Online" },
      { to: "plan", label: "Bausteine" },
      { to: "kosten", label: "Kosten" },
    ],
    fuerwen: {
      tag: "Für wen",
      h2a: "Auch ohne fertige Diagnose ",
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
          "Fragt, warum der Wert überhaupt entgleist",
          "Sucht die Auslöser: Stress, Belastungen, Darm, Ernährung",
          "Arbeitet an der Ursache, damit später weniger nötig sein kann",
        ],
      },
      exampleTag: "Ein Beispiel",
      exampleTitle: "Zwei Menschen, hoher Blutdruck: 150 zu 95.",
      readingLabel: "Gleicher Wert",
      reveal: "Was steckt dahinter?",
      persons: [
        {
          id: "A",
          name: "Person A",
          tag: "45, viel Verantwortung",
          reading: "150 / 95",
          cause:
            "Dahinter steckt oft Dauerstress, zu wenig Schlaf und zu viel Kaffee. Wir schauen gemeinsam auf Erholung, Schlaf und dein Nervensystem.",
        },
        {
          id: "B",
          name: "Person B",
          tag: "52, oft müde",
          reading: "150 / 95",
          cause:
            "Hier können eine Belastung durch Schwermetalle und ein gereizter Darm mitspielen. Wir schauen auf Ausleitung, Darm und Ernährung.",
        },
      ],
      bridge:
        "Der Wert wird bei beiden im Blick behalten. Was ihn antreibt, ist aber völlig verschieden, und genau das verändert den Plan. Ich ersetze die klassische Medizin nicht, ich denke sie weiter.",
    },
    ablauf: {
      tag: "So läuft es",
      h2a: "Zuhören, einordnen, ",
      h2em: "einen Plan geben",
      h2b: ".",
      steps: [
        { step: "01", ic: "ear", name: "Zuhören und verstehen", text: "30 Minuten Raum für deine Beschwerden, deine Geschichte, deine Biografie. Deine Empfindung nehme ich ernst, auch wenn ein Befund sie noch nicht erklärt." },
        { step: "02", ic: "magnifier", name: "Sinnvolle Diagnostik", text: "Ich fordere gezielt die Untersuchungen an, die deine nächsten Schritte wirklich verändern. Keine Tests um der Tests willen." },
        { step: "03", ic: "target", name: "Dein Erstplan", text: "Du gehst mit einer klaren ersten Roadmap raus: Lebensstil, Pflanzenheilkunde und Nährstoffe, bei Bedarf auch eine Infusion." },
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
      tag: "Mögliche Bausteine",
      h2a: "So könnte dein ",
      h2em: "Weg",
      h2b: " aussehen.",
      lead:
        "Aus dem Erstgespräch wird ein Plan mit konkreten Bausteinen. Welche davon zu dir passen, entscheiden wir gemeinsam. Ein Eindruck, womit wir arbeiten können:",
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
    hero: {
      eyebrow: "Holistic consultation · Berlin & online",
      h1a: "A look at you that ",
      h1em: "goes further",
      h1b: " than the lab report.",
      sub:
        "In 30 minutes we look at your whole story together: symptoms, values, lifestyle. I think across the boundaries of the medical fields, sort through the complexity, and you leave with a concrete first plan. Online by video or with me at the practice in Berlin.",
      strike: "Just lowering the one value that stands out.",
      planPre: "Understanding ",
      planB: "what is behind it",
      planPost: ".",
      priceNote: "30 minutes for €100. Online just like at the practice.",
      cta: "Book an appointment",
      ghost: "What does it cost?",
    },
    subnav: [
      { to: "fuerwen", label: "Who it is for" },
      { to: "vergleich", label: "The difference" },
      { to: "mehrblick", label: "Wider view" },
      { to: "ablauf", label: "How it works" },
      { to: "diagnostik", label: "Diagnostics" },
      { to: "online", label: "Online" },
      { to: "plan", label: "Building blocks" },
      { to: "kosten", label: "Cost" },
    ],
    fuerwen: {
      tag: "Who it is for",
      h2a: "The right place ",
      h2em: "even without",
      h2b: " a finished diagnosis.",
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
          "Asks why the value goes off track in the first place",
          "Looks for the triggers: stress, exposures, gut, nutrition",
          "Works on the cause, so that less may be needed later",
        ],
      },
      exampleTag: "An example",
      exampleTitle: "Two people, high blood pressure: 150 over 95.",
      readingLabel: "Same reading",
      reveal: "What is behind it?",
      persons: [
        {
          id: "A",
          name: "Person A",
          tag: "45, a lot of responsibility",
          reading: "150 / 95",
          cause:
            "Behind it there is often ongoing stress, too little sleep and too much coffee. Together we look at recovery, sleep and your nervous system.",
        },
        {
          id: "B",
          name: "Person B",
          tag: "52, often tired",
          reading: "150 / 95",
          cause:
            "Here a heavy metal exposure and an irritated gut can play a part. We look at detoxification, the gut and nutrition.",
        },
      ],
      bridge:
        "The value is kept in view for both. But what drives it is completely different, and that is exactly what changes the plan. I do not replace conventional medicine, I think it further.",
    },
    ablauf: {
      tag: "How it works",
      h2a: "Listen, make sense of it, ",
      h2em: "give a plan",
      h2b: ".",
      steps: [
        { step: "01", ic: "ear", name: "Listen and understand", text: "30 minutes of space for your symptoms, your story, your biography. I take your experience seriously, even when a report does not yet explain it." },
        { step: "02", ic: "magnifier", name: "Meaningful diagnostics", text: "I order exactly the tests that will really change your next steps. No tests for the sake of tests." },
        { step: "03", ic: "target", name: "Your first plan", text: "You leave with a clear first roadmap: lifestyle, plant-based remedies and nutrients, and an infusion if it makes sense." },
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
      tag: "Possible building blocks",
      h2a: "What your ",
      h2em: "path",
      h2b: " could look like.",
      lead:
        "The first conversation turns into a plan with concrete building blocks. Which of them fit you we decide together. Here is an impression of what we can work with:",
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

  const togglePerson = (id) =>
    setOpenPerson((s) => ({ ...s, [id]: !s[id] }));

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

      {/* Fuer wen */}
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

      {/* Vergleich */}
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

      {/* Mehrblick: wiederverwendetes Kreis-Diagramm */}
      <div id="mehrblick" className="ber-anchor"><MeinAnsatz /></div>

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

      {/* Bausteine: wiederverwendetes Karten-Grid */}
      <section className="sec plan" id="plan">
        <div className="wrap">
          <span className="sec-tag">{c.plan.tag}</span>
          <h2 className="sec-h">{c.plan.h2a}<em>{c.plan.h2em}</em>{c.plan.h2b}</h2>
          <p className="sec-lead">{c.plan.lead}</p>
        </div>
        <SchwerpunkteGrid title={null} />
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
.ber .btn-primary:hover .arrow,.ber .btn-white:hover .arrow{transform:translateX(4px)}

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
.ber .ber-anchor{scroll-margin-top:70px}
.ber .sec-tag{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px}
.ber .sec-h{font-size:clamp(2rem,3.7vw,2.9rem);line-height:1.07;letter-spacing:-.03em;font-weight:800;max-width:22ch;margin:0}
.ber .sec-h em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal-darker)}
.ber .sec-lead{font-size:1.12rem;color:var(--gray);max-width:62ch;margin-top:16px}
.ber .sec-foot{margin-top:30px;font-family:var(--serif);font-style:italic;font-size:1.02rem;color:var(--gray);max-width:66ch;border-left:3px solid var(--teal-pale);padding-left:18px}

.ber .fuerwen{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
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

.ber .ablauf{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.ber .online{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ber .stepgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:800px){.ber .stepgrid{grid-template-columns:1fr}}
.ber .mcard{border:1px solid var(--line);border-radius:20px;padding:28px 24px;background:#fff;transition:.4s var(--ease);position:relative}
.ber .mcard:hover{border-color:var(--teal);transform:translateY(-5px);box-shadow:0 28px 56px -40px rgba(31,110,112,.6)}
.ber .mcard .step{font-family:var(--serif);font-size:1.6rem;color:var(--teal-pale);position:absolute;top:16px;right:22px}
.ber .mcard .mic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:16px}
.ber .mcard h4{font-size:1.12rem;font-weight:700;margin:0}
.ber .mcard p{font-size:.93rem;color:var(--gray);margin-top:10px;line-height:1.6}

.ber .diagnostik{background:#fff}

.ber .plan{background:linear-gradient(180deg,var(--teal-subtle),#fff);padding-bottom:40px}

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
  .ber .hero{padding:46px 0 38px}
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
