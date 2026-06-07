// src/lib/honorarForms.js
//
// Single source of truth for the five Honorarvereinbarung (fee-agreement) forms
// shown in the practice on the iPad (/honorar). Each entry drives both the hub
// card and the form page — add or edit a service here, nothing else.
//
// Fields:
//   slug      – URL segment (/honorar/:slug) and DB value
//   label     – short name shown on the hub card
//   tagline   – one-line descriptor on the hub card
//   title     – <h1> on the form
//   gesetz    – legal reference line
//   rows      – GOÄ service table: { nr, leistung, faktor, betrag }
//   gesamt    – total line (string, already formatted)
//   skNotes   – optional extra notes specific to this service (material costs etc.)

const BEHANDLER =
  "Shukri Jarmoukli, ViveCura, Skalitzer Straße 137, 10999 Berlin";

const PREAMBLE =
  "Für die nachfolgend aufgeführten ärztlichen Leistungen wird vor deren Erbringung eine von der Gebührenordnung für Ärzte (GOÄ) abweichende Höhe der Vergütung (Steigerungssatz) vereinbart:";

// Standard notes shown on every form, below any service-specific skNotes.
const PFLICHT =
  "Eine Erstattung der vereinbarten Vergütung durch Erstattungsstellen (private Krankenversicherung, Beihilfe) ist möglicherweise nicht in vollem Umfang gewährleistet.";

const HINWEIS =
  "Es handelt sich um eine privatärztliche Selbstzahlerleistung. Eine Erstattung durch die gesetzliche Krankenversicherung ist nicht vorgesehen. Diese Vereinbarung betrifft ausschließlich die Höhe der Vergütung und wird vor Beginn der Behandlung getroffen.";

const HONORAR_FORMS = [
  {
    slug: "ganzheitliche-analyse",
    label: "Ganzheitliche Analyse",
    tagline: "HRV · BIA · neurologische & körperliche Untersuchung",
    title: "Honorarvereinbarung — Ganzheitliche Analyse",
    gesetz: "Honorarvereinbarung gemäß § 2 Abs. 1 und 2 GOÄ",
    rows: [
      { nr: "846", leistung: "Vertiefende Praxisübung", faktor: "2,3", betrag: "20,10 €" },
      { nr: "A 652", leistung: "Computergestützte Analyse der Herzratenvariabilität mit vegetativer Funktionsprüfung und HRV-Biofeedback", faktor: "2,3", betrag: "59,66 €" },
      { nr: "A 612", leistung: "InBody Bioelektrische Impedanzanalyse (BIA) zur Beurteilung der Körperzusammensetzung", faktor: "1,8", betrag: "79,42 €" },
      { nr: "5", leistung: "Symptombezogene Untersuchung", faktor: "2,3", betrag: "10,72 €" },
      { nr: "75", leistung: "Ausführlicher schriftlicher Krankheits- und Befundbericht", faktor: "2,3", betrag: "17,43 €" },
      { nr: "602", leistung: "Oxymetrische Untersuchung (Sauerstoffsättigung)", faktor: "1,8", betrag: "15,95 €" },
      { nr: "643", leistung: "Periphere Messung des Arteriendrucks", faktor: "1,8", betrag: "12,58 €" },
      { nr: "A 36", leistung: "Strukturierte Schulung einer Einzelperson, Mindestdauer 20 Min", faktor: "2,3", betrag: "40,22 €" },
      { nr: "34", leistung: "Erörterung (mind. 20 Min) der Auswirkungen einer Krankheit auf die Lebensgestaltung", faktor: "2,3", betrag: "40,23 €" },
      { nr: "800", leistung: "Eingehende neurologische Untersuchung", faktor: "2,3", betrag: "26,14 €" },
      { nr: "7", leistung: "Vollständige körperliche Untersuchung mindestens eines Organsystems", faktor: "2,3", betrag: "21,45 €" },
      { nr: "3306", leistung: "Chirotherapeutische Diagnostik mit entsprechendem Griff an der Wirbelsäule", faktor: "3,5", betrag: "30,19 €" },
    ],
    gesamt: "Gesamthonorar: 374,09 €",
    skNotes: [],
  },
  {
    slug: "infusion",
    label: "Infusion",
    tagline: "Intravenöse Infusionstherapie",
    title: "Honorarvereinbarung — Infusion",
    gesetz: "Honorarvereinbarung gemäß § 2 Abs. 1 und 2 GOÄ",
    rows: [
      { nr: "261", leistung: "Einbringung von Arzneimitteln in einen parenteralen Katheter", faktor: "2,3", betrag: "4,02 €" },
      { nr: "602", leistung: "Oxymetrische Untersuchung (Sauerstoffsättigung)", faktor: "1,8", betrag: "15,95 €" },
      { nr: "643", leistung: "Periphere Messung des Arteriendrucks", faktor: "1,8", betrag: "12,58 €" },
      { nr: "5", leistung: "Symptombezogene Untersuchung", faktor: "2,3", betrag: "10,72 €" },
      { nr: "272", leistung: "Infusion, intravenös", faktor: "3,5", betrag: "36,72 €" },
      { nr: "846", leistung: "Vertiefende Praxisübung", faktor: "2,3", betrag: "20,10 €" },
      { nr: "3", leistung: "Eingehende, das gewöhnliche Maß übersteigende Beratung", faktor: "2,3", betrag: "20,10 €" },
      { nr: "538", leistung: "Infrarotbehandlung, je Sitzung", faktor: "2,5", betrag: "5,83 €" },
      { nr: "268", leistung: "Medikamentöse Infiltrationsbehandlung mehrerer Körperregionen", faktor: "2,3", betrag: "17,43 €" },
    ],
    gesamt: "Gesamthonorar: 143,45 € (ärztliches Honorar)",
    skNotes: [
      "Zuzüglich Sachkosten je nach Infusion, gesondert ausgewiesen (z. B. Wirkstoff und Infusionsmaterialien). Sachkosten sind nicht Teil des ärztlichen Honorars.",
    ],
  },
  {
    slug: "ketamin",
    label: "Ketamin-assistierte Therapie",
    tagline: "Ketamin-Infusion mit psychotherapeutischer Begleitung",
    title: "Honorarvereinbarung — Ketamin-assistierte Therapie",
    gesetz: "Honorarvereinbarung gemäß § 2 Abs. 1 und 2 GOÄ",
    rows: [
      { nr: "261", leistung: "Einbringung von Arzneimitteln in einen parenteralen Katheter", faktor: "2,3", betrag: "4,02 €" },
      { nr: "846", leistung: "Vertiefende Praxisübung", faktor: "2,3", betrag: "20,10 €" },
      { nr: "3", leistung: "Eingehende, das gewöhnliche Maß übersteigende Beratung, auch mittels Fernsprecher", faktor: "2,3", betrag: "20,10 €" },
      { nr: "602", leistung: "Oxymetrische Untersuchung (Sauerstoffsättigung)", faktor: "1,8", betrag: "15,95 €" },
      { nr: "643", leistung: "Periphere Messung des Arteriendrucks", faktor: "1,8", betrag: "12,58 €" },
      { nr: "5", leistung: "Symptombezogene Untersuchung", faktor: "2,3", betrag: "10,72 €" },
      { nr: "637", leistung: "Pulswellenlaufzeitbestimmung, ggf. mit elektrokardiographischer Kontrolle", faktor: "1,8", betrag: "23,82 €" },
      { nr: "849", leistung: "Psychotherapeutische Behandlung bei psychoreaktiven, psychosomatischen oder neurotischen Störungen", faktor: "3,5", betrag: "46,92 €" },
      { nr: "861", leistung: "Tiefenpsychologisch fundierte Psychotherapie, Einzelbehandlung, Dauer mind. 50 Min", faktor: "3,5", betrag: "140,76 €" },
      { nr: "A 36", leistung: "Strukturierte Schulung einer Einzelperson, Mindestdauer 20 Min", faktor: "3,5", betrag: "61,20 €" },
      { nr: "272", leistung: "Infusion, intravenös", faktor: "3,5", betrag: "36,72 €" },
      { nr: "272", leistung: "Infusion, intravenös", faktor: "2,3", betrag: "24,13 €" },
    ],
    gesamt: "Gesamthonorar: 417,02 € (zzgl. Infusionsmaterialien 6,85 € = 423,87 €)",
    skNotes: [
      "Zuzüglich Sachkosten (Infusionsmaterialien) 6,85 €. Diese Honorarvereinbarung ersetzt nicht die gesonderte ärztliche Aufklärung und Einwilligung zur (Off-Label-)Ketamin-Behandlung.",
    ],
  },
  {
    slug: "mentoring",
    label: "Mentoring",
    tagline: "Begleitetes Mentoring mit Atem- & Übungsprogramm",
    title: "Honorarvereinbarung — Mentoring",
    gesetz: "Honorarvereinbarung gemäß § 2 Abs. 1 und 2 GOÄ",
    rows: [
      { nr: "A 505", leistung: "BOLT-Atemtest, analog Atembehandlung gemäß § 6 Abs. 2 GOÄ", faktor: "1,8", betrag: "8,91 €" },
      { nr: "A 36", leistung: "Strukturierte Schulung einer Einzelperson, Mindestdauer 20 Min", faktor: "2,3", betrag: "40,22 €" },
      { nr: "A 78", leistung: "Übungsprogramm, individuell aufgestellt, analog Behandlungsplan § 6 Abs. 2 GOÄ", faktor: "2,3", betrag: "24,13 €" },
      { nr: "806", leistung: "Eingehendes therapeutisches Gespräch", faktor: "3,5", betrag: "51,00 €" },
      { nr: "849", leistung: "Psychotherapeutische Behandlung bei psychoreaktiven, psychosomatischen oder neurotischen Störungen", faktor: "3,5", betrag: "46,92 €" },
      { nr: "846", leistung: "Vertiefende Praxisübung", faktor: "2,3", betrag: "20,10 €" },
      { nr: "602", leistung: "Oxymetrische Untersuchung (Sauerstoffsättigung)", faktor: "1,8", betrag: "15,95 €" },
      { nr: "643", leistung: "Periphere Messung des Arteriendrucks", faktor: "1,8", betrag: "12,58 €" },
      { nr: "5", leistung: "Symptombezogene Untersuchung", faktor: "2,3", betrag: "10,72 €" },
    ],
    gesamt: "Gesamthonorar: 230,53 €",
    skNotes: [],
  },
  {
    slug: "psychotherapie",
    label: "Psychotherapie",
    tagline: "Psychotherapeutische Behandlung",
    title: "Honorarvereinbarung — Psychotherapeutische Behandlung",
    gesetz: "Honorarvereinbarung gemäß § 2 Abs. 1 und 2 GOÄ",
    rows: [
      { nr: "5", leistung: "Visuelle symptombezogene Untersuchung", faktor: "2,3", betrag: "10,72 €" },
      { nr: "A 505", leistung: "BOLT-Atemtest, analog Atembehandlung gemäß § 6 Abs. 2 GOÄ", faktor: "1,8", betrag: "8,91 €" },
      { nr: "A 36", leistung: "Strukturierte Schulung einer Einzelperson, Mindestdauer 20 Min", faktor: "3,5", betrag: "61,20 €" },
      { nr: "870", leistung: "Verhaltenstherapie gemäß § 6 Abs. 2 GOÄ", faktor: "2,3", betrag: "100,56 €" },
      { nr: "78", leistung: "Behandlungsplan, individuell für den einzelnen Patienten aufgestellt", faktor: "2,3", betrag: "24,13 €" },
      { nr: "849", leistung: "Psychotherapeutische Behandlung bei psychoreaktiven, psychosomatischen oder neurotischen Störungen", faktor: "3,5", betrag: "46,92 €" },
    ],
    gesamt: "Gesamthonorar: 252,44 €",
    skNotes: [],
  },
];

export { BEHANDLER, PREAMBLE, PFLICHT, HINWEIS, HONORAR_FORMS };

export function getHonorarForm(slug) {
  return HONORAR_FORMS.find((f) => f.slug === slug) || null;
}
