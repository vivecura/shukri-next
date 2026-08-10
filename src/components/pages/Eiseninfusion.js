"use client";

/**
 * Eiseninfusion. Spezialbereich /eiseninfusion, ViveCura Berlin.
 * Stil & CSS-System portiert aus DiagnostikNew (gekapselt unter .ei, kein Leaken).
 * Nav/Footer global über SiteChrome; Fonts über --font-plus-jakarta / --font-libre-baskerville.
 *
 * HINWEIS: EN-Version folgt vor Live-Gang. Aktuell nur DE; Fallback in der Komponente auf CONTENT.de.
 * STIL: Du-Anrede (wie die restliche ViveCura-Website). Keine Gedankenstriche im Fließtext (Shukri-Regel).
 * PREISE (Richtwerte, "ca."): Honorar 130 EUR + Praeparat. FerMed 100 mg Ampulle ~17 EUR (200 mg = 2 Ampullen ~34 EUR).
 *   Ferinject 500 mg ~168 EUR, Monofer 500 mg ~189 EUR. Erste Infusion ~164 EUR, Folge ~298 bis 319 EUR. Extra Stunde +60 EUR.
 */

import { useEffect, useRef } from "react";
import useLanguage from "@/hooks/useLanguage";

const BOOK = "https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile";

/* ---------------- Icons ---------------- */
const svg = (inner) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const IC = {
  bolt: svg('<path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>'),
  moon: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
  spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>'),
  heart: svg('<path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z"/>'),
  cloud: svg('<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z"/>'),
  snow: svg('<path d="M12 2v20M4 6l16 12M20 6L4 18"/>'),
  droplet: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  stomach: svg('<path d="M8 3v5a5 5 0 0 0 5 5h1a4 4 0 0 1 0 8c-3.5 0-6-2.5-6-6"/>'),
  flame: svg('<path d="M12 12c2-3 0-7-1-8 0 3-1.8 4.7-3 6s-2 3.2-2 5a6 6 0 1 0 12 0c0-1.5-1.1-3.9-2-5-1.8 3-2.8 3-4 2z"/>'),
  activity: svg('<path d="M2 12h4l2.5-7 4.5 15 3-8 2 3h4"/>'),
  leaf: svg('<path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16zM4 20c4-4 8-6 12-7"/>'),
  magnifier: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  target: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>'),
  pill: svg('<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9.5-4.8-1.2-8-5-8-9.5V6z"/><path d="M9 12l2 2 4-4"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>'),
  file: svg('<path d="M6 2h8l6 6v14H6z"/><path d="M14 2v6h6M9 14h6M9 17h6"/>'),
  gauge: svg('<path d="M12 13l4-4"/><path d="M4.5 18a9 9 0 1 1 15 0"/><circle cx="12" cy="13" r="1.6"/>'),
  scale: svg('<path d="M12 3v18M6 21h12M12 6l-7 3 3 4a3 3 0 0 1-6 0l3-4M12 6l7 3-3 4a3 3 0 0 0 6 0l-3-4"/>'),
};
const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const ARROW = '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CHEV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

/* ---------------- Inhalt (DE) ---------------- */
const CONTENT = {
  de: {
    hero: {
      eyebrow: "Eiseninfusion · Eisenmangel · Ferritin · Berlin",
      h1a: "Dein Eisen, endlich ", h1em: "ernst genommen", h1b: ".",
      sub: "Müdigkeit, Schlafstörungen, Haarausfall, ruhelose Beine, gedrückte Stimmung. Vielleicht steckt ein Eisenmangel dahinter, den lange niemand ernst genommen hat, weil viele Labore noch mit veralteten Referenzwerten arbeiten. Wir suchen gemeinsam die Ursachen, die dahinterstecken können, und arbeiten dann daran. Sorgfältig und ärztlich begleitet in Berlin.",
      strike: "Bei uns heißt es nie nur „deine Werte sind normal“.",
      plan: "Wir sehen den <b>Menschen als Ganzes</b>, nicht nur Referenzbereiche.",
      cta: "Termin vereinbaren", ghost: "Was kostet das?",
    },
    subnav: [
      { to: "#symptome", label: "Symptome" },
      { to: "#werte", label: "Werte verstehen" },
      { to: "#ursachen", label: "Ursachen" },
      { to: "#tablette-infusion", label: "Tablette oder Infusion" },
      { to: "#ablauf", label: "Ablauf & Sicherheit" },
      { to: "#nebenwirkungen", label: "Wirkung & Nebenwirkung" },
      { to: "#praeparate", label: "Präparate" },
      { to: "#kosten", label: "Kosten" },
      { to: "#wissen", label: "Ratgeber" },
    ],
    symptome: {
      tag: "Vielleicht kennst du das",
      h2a: "Wenn der Körper auf ", h2em: "Sparflamme", h2b: " läuft.",
      lead: "Ein Eisenmangel zeigt sich selten als eine einzige Sache. Er kann sich als eine Summe von Kleinigkeiten zeigen, die du dir lange nicht erklären kannst und die zusammen viel Lebensqualität kosten können.",
      cards: [
        { ic: IC.bolt, t: "Müdigkeit und Erschöpfung", p: "Ständig erschöpft, obwohl du eigentlich genug schläfst. Belastung fällt schwerer als früher." },
        { ic: IC.spark, t: "Haarausfall", p: "Mehr Haare in Bürste und Abfluss, dünner werdendes Haar. Manchmal ein früh sichtbares Zeichen." },
        { ic: IC.moon, t: "Schlaf und ruhelose Beine", p: "Schlechter Schlaf, nächtliches Erwachen, unruhige Beine am Abend, die keiner erklären kann." },
        { ic: IC.heart, t: "Stimmung und Antrieb", p: "Reizbarkeit, innere Unruhe, Antriebslosigkeit, gedrückte Stimmung ohne klaren Auslöser." },
        { ic: IC.cloud, t: "Konzentration und Brain Fog", p: "Gedanken wie im Nebel, schlechteres Gedächtnis, das Gefühl, nicht ganz da zu sein." },
        { ic: IC.snow, t: "Blässe, Frieren, Schwindel", p: "Blasse Haut, kalte Hände und Füße, Schwindel oder Herzklopfen schon bei leichter Belastung." },
      ],
      foot: "Das Unfaire daran: Viele Menschen leben lange mit solchen Beschwerden, ohne zu wissen, dass ein Eisenmangel dahinterstecken kann. Jedes dieser Zeichen kann viele Ursachen haben. Ein ehrlicher Blick auf deine Eisenwerte kann dir eine erste, wichtige Antwort geben.",
    },
    werte: {
      tag: "Der Aha-Moment",
      h2a: "„Normal“ ist nicht dasselbe wie ", h2em: "gut versorgt", h2b: ".",
      lead: "Lange galt erst ein sehr niedriger Ferritin-Wert als Mangel, oft erst unter 15. Ich arbeite seit Jahren mit einem anderen, wissenschaftlich begründeten Blick. Und langsam kommt dieser Blick auch in den deutschen Laboren an.",
      cards: [
        { ic: IC.magnifier, t: "Funktioneller Eisenmangel", p: "Ein möglicher Mangel, obwohl keine Blutarmut vorliegt und das Blutbild „normal“ aussieht. Die Speicher können leer sein, die Symptome sind echt. Ich schaue auf beides, mit und ohne Anämie." },
        { ic: IC.target, t: "Die Referenzwerte ändern sich", p: "Labore wie das IMD Berlin gehen inzwischen davon aus, dass schon ein Ferritin unter 100 für entleerte Eisenspeicher sprechen kann. Früher galt oft erst ein Wert unter 15 als auffällig. Viele Labore in Deutschland rechnen aber noch mit den alten Grenzen." },
        { ic: IC.layers, t: "Jahrelang übersehen", p: "So können Menschen auf dem Papier gesund wirken, während ihr Speicher längst zu leer ist. Gerade Frauen motivieren sich dann täglich selbst, um zu funktionieren, und hören beim Arzt, alles sei normal. Rückblickend kann sich das als übersehener Eisenmangel zeigen." },
      ],
    },
    ursachen: {
      tag: "Wir suchen die Wurzel",
      h2a: "Eisenmangel ist ein ", h2em: "Symptom", h2b: ", kein Zufall.",
      lead: "Für mich hört Behandlung nicht bei der Infusion auf. Ich will wissen, warum dein Eisen überhaupt fehlt. Deshalb forschen wir gemeinsam nach den Gründen, statt den Speicher immer wieder neu aufzufüllen. So kann aus einer Infusion eine nachhaltige Behandlung werden.",
      cards: [
        { ic: IC.droplet, t: "Blutverluste", items: ["Starke oder lange Menstruation", "Verstecktes Bluten im Magen-Darm-Trakt", "Häufiges Blutspenden"] },
        { ic: IC.stomach, t: "Aufnahmestörungen", items: ["Magen-Darm-Erkrankungen", "Säurehemmende Medikamente", "Zöliakie, Reizdarm, gereizte Darmschleimhaut"] },
        { ic: IC.flame, t: "Chronische, stille Entzündungen", items: ["Entzündungen können Eisen einsperren", "Es ist da, kommt aber nicht an", "Eine oft unterschätzte mögliche Ursache"] },
        { ic: IC.activity, t: "Erhöhter Bedarf", items: ["Sport und Ausdauertraining", "Schwangerschaft und Stillzeit", "Wachstumsphasen"] },
        { ic: IC.leaf, t: "Ernährung", items: ["Vegetarisch oder vegan", "Einseitige Ernährung", "Wenig gut verfügbares Eisen"] },
      ],
      foot: "Was wir finden, fließt direkt in deinen Plan: eine bessere Aufnahme im Darm, Ruhe für stille Entzündungen, und wenn dein Gesamtbild es nahelegt, der Blick auf weitere Belastungen wie Schwermetalle oder Schimmel. So können wir an den möglichen Wurzeln ansetzen, nicht nur am einzelnen Wert.",
    },
    duo: {
      tag: "Tablette oder Infusion?",
      h2a: "Wann Tabletten reichen und wann ", h2em: "nicht", h2b: ".",
      lead: "Tabletten sind oft der erste Weg, und das ist gut so. Aber sie haben Grenzen. Ein großer Teil des Eisens wird im Darm nicht aufgenommen, das kann viele Monate dauern. Und wer eine Aufnahmestörung hat, hat oft kaum eine andere Wahl, als den Darm ganz zu umgehen.",
      cards: [
        { t: "Eisentabletten", tag: "Der erste Weg", p: "Günstig und einfach, wenn du sie gut verträgst. Ein großer Teil des Eisens wird im Darm allerdings nicht aufgenommen, die Bioverfügbarkeit ist niedrig. Manche Menschen bekommen von Tabletten Magendruck, Übelkeit oder Verstopfung, andere vertragen sie gut.", hi: false },
        { t: "Eiseninfusion", tag: "Wenn Tabletten nicht reichen", p: "Das Eisen kann direkt dort ankommen, wo es gebraucht wird, unabhängig vom Darm. Der Speicher kann sich schneller füllen, die Dosis ist gut steuerbar. Sie kann besonders sinnvoll sein, wenn Tabletten nicht vertragen werden, nicht ausreichen oder eine Aufnahmestörung den Weg über den Darm erschwert.", hi: true },
      ],
    },
    tempo: {
      tag: "Warum Tempo zählen kann",
      h2a: "Deinen Speicher ", h2em: "schneller", h2b: " auffüllen.",
      lead: "Eisentabletten brauchen oft viele Monate, und ein großer Teil wird im Darm nicht aufgenommen. Eine Infusion umgeht diesen Weg. Das Eisen kann direkt ankommen, und der Speicher kann sich deutlich schneller füllen. Das ist pharmakologisch gut nachvollziehbar.",
      body: "Viele Menschen, die zu mir kommen, möchten nicht monatelang warten, bis sich etwas bewegt. Sie brauchen ihre Energie für Arbeit, Familie und Alltag. Dafür möchte ich in Berlin eine verlässliche, ärztlich begleitete Anlaufstelle sein.",
      note: "Ob und wie schnell sich Beschwerden bessern, ist von Mensch zu Mensch verschieden und lässt sich nicht versprechen. Was ich dir zusagen kann, ist ein sorgfältig begleiteter Weg, deinen Eisenspeicher aufzufüllen.",
    },
    ablauf: {
      tag: "Sicherheit hat Vorrang",
      h2a: "Mein Vorgehen: ", h2em: "Schutz", h2b: " zuerst.",
      lead: "Eine Eiseninfusion gilt heute als gut verträglich, wenn sie sorgfältig gemacht wird. Ganz ohne Risiko ist kein medizinischer Eingriff. „Sorgfältig“ heißt für mich: erst prüfen, vorsichtig beginnen, gut überwachen. Und dich in jedem Schritt mitnehmen.",
      steps: [
        { step: "01", name: "Prüfen und aufklären", text: "Wir schauen auf deine Werte, deine Vorgeschichte und die möglichen Ursachen. Vor der Infusion prüfe ich außerdem deine Vitalwerte, also Blutdruck, Herzfrequenz und Sauerstoffsättigung, und wir klären, ob eine Infusion für dich sinnvoll ist und wo sie es ausdrücklich nicht ist." },
        { step: "02", name: "Verträglichkeit testen", text: "Hattest du noch nie eine Eiseninfusion, teste ich zuerst behutsam die Verträglichkeit, bevor überhaupt an eine höhere Dosis zu denken ist." },
        { step: "03", name: "Behutsam starten, höchstens 200 mg", text: "Die erste Infusion gebe ich grundsätzlich niedriger dosiert, meist 100 bis 200 mg und höchstens 200 mg. Bewusst nicht die Höchstdosis, weil sich beim ersten Mal noch nicht sicher sagen lässt, wie dein Körper reagiert." },
        { step: "04", name: "Überwachen und ruhig reagieren", text: "Während und nach der Gabe behalte ich dich im Blick. Allergische Reaktionen gelten als selten. Ich bin darauf vorbereitet und kann im Fall der Fälle sofort reagieren." },
        { step: "05", name: "Dann gezielt höher", text: "Verträgst du die erste Infusion gut, können Folge-Infusionen höher dosiert werden, mit dem Präparat, das zu deinem Ziel und deinem Speicher passt." },
      ],
      foot: "So weißt du in jedem Schritt, was passiert und warum. Wie eine Eiseninfusion wirken kann und welche Nebenwirkungen möglich sind, schaue ich mir mit dir gleich ganz ehrlich an.",
    },
    nebenwirkungen: {
      tag: "Ehrlich, beide Seiten",
      h2a: "Was eine Eiseninfusion bringen kann, und was ", h2em: "möglich", h2b: " ist.",
      lead: "Ehrlichkeit gehört für mich dazu. Eine Eiseninfusion hat gute Seiten und mögliche Nebenwirkungen. Beides gehört offen auf den Tisch, damit du frei entscheiden kannst.",
      nutzenTitle: "Wozu ein gefüllter Eisenspeicher beitragen kann",
      nutzen: [
        "Mehr Energie im Alltag",
        "Ruhigerer, erholsamerer Schlaf",
        "Klarere Konzentration, weniger Nebel im Kopf",
        "Ausgeglichenere Stimmung",
        "Weniger Frieren, ein besseres Wärmegefühl",
        "Weniger Haarausfall über die Zeit",
      ],
      nutzenNote: "Davon berichten viele Menschen, wenn ihr Eisenspeicher wieder gefüllt ist. Ein Versprechen ist es nicht, jeder Körper ist anders.",
      nwTitle: "Was an Nebenwirkungen möglich ist",
      nw: [
        { f: "Häufig", h: "etwa 1 bis 10 von 100", t: "Übelkeit, Kopfschmerzen, kurzes Hitzegefühl oder Hautrötung, metallischer Geschmack, eine Reaktion an der Einstichstelle" },
        { f: "Gelegentlich", h: "etwa 1 bis 10 von 1.000", t: "Muskel- und Gliederschmerzen, Müdigkeit, Schwindel, Bauchschmerzen, leichtes Fieber" },
        { f: "Selten", h: "weniger als 1 von 1.000", t: "eine schwere allergische Reaktion" },
      ],
      reframe: "Laut den Fachinformationen und Studien sind die meisten Nebenwirkungen mild und vorübergehend. Schwere Reaktionen sind selten. Genau deshalb beginne ich vorsichtig und behalte dich bei jeder Infusion im Blick. So kennst du beide Seiten und entscheidest in Ruhe.",
    },
    nutzenrisiko: {
      tag: "Nutzen und Risiko im Blick",
      h2a: "Die richtige Dosis für ", h2em: "dich", h2b: ", nicht von der Stange.",
      lead: "Bevor ich eine Infusion gebe, wäge ich Nutzen und Risiko sorgfältig ab, für dich ganz persönlich. Ich suche das Präparat und die Dosis, die zu deinem Wert, deinem Ziel und deiner Verträglichkeit passen.",
      points: [
        "Welche Dosis bringt dir am meisten, ohne unnötige Belastung?",
        "Welches Präparat passt zu deiner Vorgeschichte und Verträglichkeit?",
        "Was ist wirtschaftlich sinnvoll, damit du nicht mehr zahlst als nötig?",
      ],
      foot: "Diese Abwägung mache ich bei jedem Menschen neu. Die Erfahrung aus vielen Eisenbehandlungen hilft mir, deine Situation gut einzuschätzen und mit dir den Weg zu finden, der Nutzen und Verträglichkeit in eine gute Balance bringt.",
    },
    praeparate: {
      tag: "Ehrlich erklärt",
      h2a: "Nicht jedes Eisen ist ", h2em: "gleich", h2b: ".",
      lead: "Ärzte dosieren Eiseninfusionen je nach Präparat zwischen etwa 60 und 500 mg pro Sitzung, im Krankenhaus teils bis 1000 mg. Welches für dich passt, hängt von Ziel, Vorgeschichte und Verträglichkeit ab. Ich erkläre dir offen, was ich verwende, und warum.",
      cards: [
        { name: "Ferrlecit 62,5 mg", dose: "62,5 mg", forwho: "Niedrig dosiert, für besondere Situationen.", benefit: "Ein älteres Eisenpräparat, das pro Ampulle nur 62,5 mg Eisen enthält und deshalb bewusst niedrig dosiert gegeben wird. Es ist vor allem für Menschen gedacht, die nur kleine Eisenmengen auf einmal bekommen sollen, zum Beispiel bei einer Dialyse. Für eine vollständige Auffüllung bräuchte es viele einzelne Sitzungen. Für die übliche Eiseninfusion in meiner Praxis setze ich es deshalb in der Regel nicht ein." },
        { name: "FerMed oder Venofer", dose: "bis 200 mg", forwho: "Meine bevorzugte erste Infusion für die meisten.", benefit: "Beide sind Eisen-Saccharose-Präparate der mittleren Klasse und dürfen bis 200 mg pro Sitzung gegeben werden. Eine Ampulle mit 100 mg kostet etwa 17 bis 20 €, für 200 mg brauchst du also zwei. Damit sind sie deutlich günstiger als die Hochdosis-Präparate und für die erste Infusion die richtige Balance aus Wirkung und Vorsicht." },
        { name: "Ferinject und Monofer", dose: "bis 500 mg", forwho: "Für Folge-Infusionen oder wenn viel aufzufüllen ist.", benefit: "Diese Präparate sind moderner aufgebaut: Der Eisenkern ist fester verpackt, sodass weniger freies Eisen im Blut entstehen kann. Deshalb sind größere Einzeldosen bis 500 mg in einer Sitzung möglich, also weniger Termine. Monofer wird wegen seiner besonderen Herstellung oft als besonders gut verträglich beschrieben, das erklärt einen Teil des höheren Preises. Wichtig: Es gibt sie nicht nur in Hochdosis. Ich kann Ferinject und Monofer auch niedriger dosieren, etwa 100 oder 200 mg, wenn du gezielt in ein besser verträgliches Präparat investieren möchtest, auch ohne gleich die volle Menge zu geben. Als allererste Infusion in Hochdosis setze ich sie bewusst nicht ein, weil die hohe Dosis vor dem Verträglichkeitstest zu früh käme." },
      ],
      allin: "Welches Präparat und welche Dosis für dich passt, entscheiden wir gemeinsam, nach deinen Werten, deinem Ziel und deiner Verträglichkeit.",
    },
    ruf: {
      tag: "Der schlechte Ruf",
      h3a: "Warum Eiseninfusionen einen ", h3em: "schlechten Ruf", h3b: " haben und warum das veraltet ist.",
      p: "Vor 50 bis 70 Jahren gab es Eisenpräparate, die schwere Reaktionen deutlich öfter auslösten als die heutigen. Die Zurückhaltung gegenüber Eiseninfusionen stammt aus dieser Zeit und war damals berechtigt. Die modernen Präparate von heute werden völlig anders hergestellt und gelöst und gelten als deutlich verträglicher als die alten Substanzen. Genau deshalb liegt mir so viel daran, wie eine Eiseninfusion heute gemacht wird: mit Ruhe, mit Sorgfalt und mit dem heutigen Wissen. Nicht die alte Angst, sondern der heutige Stand.",
    },
    kosten: {
      tag: "Transparent",
      h2a: "Was es ", h2em: "kostet", h2b: " und warum es das wert ist.",
      lead: "Für gesetzlich Versicherte ist eine Eiseninfusion bei mir eine Selbstzahlerleistung. Bist du privat versichert, kann deine Kasse sie je nach Indikation und Tarif übernehmen, dazu unten mehr. Und in jedem Fall ist sie viel mehr als nur eine Infusion. Du zahlst nicht für einen Beutel Eisen, sondern für die ärztliche Begleitung drumherum: die Untersuchung, die Anamnese, die Suche nach dem Warum und deinen Plan für eine nachhaltige Lösung.",
      honorar: "Der Preis steht bei mir nicht für einen Beutel Eisen, sondern für alles drumherum. Bevor ich Eisen gebe, prüfe ich deine Vitalwerte, also Blutdruck, Herzfrequenz und Sauerstoffsättigung. Ich nehme mir Zeit für deine Anamnese, prüfe sorgfältig die Indikationen und Gegenanzeigen und suche nach den Ursachen hinter deinem Mangel. Mir geht es nicht darum, möglichst viele Infusionen zu geben. Mir geht es darum, dich als ganzen Menschen zu sehen, bevor ich behandle. In jedem Preis stecken deshalb die ärztliche Untersuchung, die Beratung, die Infusion selbst und alle Materialien.",
      valueTitle: "Was in jeder Infusion mitläuft",
      value: [
        { ic: IC.gauge, t: "Check deiner Vitalwerte: Blutdruck, Herzfrequenz, Sauerstoffsättigung" },
        { ic: IC.file, t: "Ausführliche Anamnese statt schneller Spritze" },
        { ic: IC.shield, t: "Prüfung von Indikationen und Gegenanzeigen" },
        { ic: IC.magnifier, t: "Ursachenforschung: warum fehlt das Eisen überhaupt?" },
        { ic: IC.stomach, t: "Ein Plan für die bessere Aufnahme im Darm" },
        { ic: IC.flame, t: "Der Blick auf stille Entzündungen, die Eisen blockieren können" },
        { ic: IC.leaf, t: "Wenn nötig: Entgiftung von Schwermetallen, Schimmel und mehr" },
        { ic: IC.heart, t: "Begleitung, damit der Mangel möglichst nicht wiederkommt" },
      ],
      stunde: "Im Standard bekommst du eine <b>halbe Stunde</b> ärztliche Begleitung. Wenn du mehr Tiefe möchtest, eine ausführliche <b>ganze Stunde</b> für deine Fragen und deine Geschichte, kannst du sie für rund <b>60 € mehr</b> dazunehmen.",
      kasseTitle: "Und wenn du privat versichert bist?",
      kasse: "Viele denken, sie müssten eine Eiseninfusion immer selbst zahlen. Das stimmt so oft nicht. Bist du privat versichert, zum Beispiel als Beamtin oder Beamter, übernimmt deine Kasse die Infusion in der Regel, wenn eine klare Indikation vorliegt: etwa ein nachgewiesener Mangel, wenn Eisentabletten nicht vertragen werden oder bei einer Darmerkrankung nicht ankommen. Eine Garantie dafür gibt es nicht, sie hängt von deinem Tarif und der Indikation ab. Aber in vielen Fällen wird sie erstattet.",
      cards: [
        { tag: "Erste Infusion", name: "200 mg FerMed", amount: "ca. 177 €", note: "Die übliche erste Infusion mit mittlerer Dosis, bewusst vorsichtig gewählt. Enthalten sind die ärztliche Untersuchung und Beratung, das Präparat und alle Materialien." },
        { tag: "Folge-Infusion", name: "500 mg Monofer", amount: "ca. 330 €", note: "Die höhere Dosis gebe ich erst, wenn deine Verträglichkeit bekannt ist, zum Beispiel nach einer gut vertragenen ersten Infusion. Je nach Menge und Präparat kann eine Folge-Infusion unterschiedlich viel kosten." },
      ],
      vergleichTitle: "Warum der günstigste Preis nicht immer der günstigste ist",
      vergleich: "Die Preise unterscheiden sich vor allem, weil die Dosis pro Sitzung sich unterscheidet. Bei kleineren Dosen von 60 oder 100 mg brauchst du für dieselbe Gesamtmenge Eisen mehr Termine, und das kann sich am Ende sogar zu einem höheren Betrag summieren. Für mich zählt aber ohnehin etwas anderes als der reine Preis: Ich möchte dich nicht wie an einer Tankstelle schnell mit Eisen auftanken, sondern dich als ganzen Menschen sehen. Dein Eisenmangel ist für mich ein Symptom, hinter dem oft eine Ursache steckt, die sich mitbehandeln lässt.",
      foot: "Alle Preise sind Richtwerte. Die genaue Dosis und das passende Präparat legen wir gemeinsam fest, nach deinen Werten und deinem Ziel.",
    },
    zeit: {
      tag: "Bevor du kommst",
      h2a: "Nimm dir ", h2em: "Zeit", h2b: ", etwa zwei Stunden.",
      lead: "Wie schnell eine Eiseninfusion laufen darf, ist von Mensch zu Mensch verschieden. Bei manchen geht es zügig, bei anderen lasse ich sie bewusst etwas langsamer laufen. Je nach Präparat und Verträglichkeit dauert eine Infusion zwischen einer Dreiviertelstunde und etwa zwei Stunden.",
      body: "Plane deshalb am besten rund zwei Stunden ein und komm ohne Zeitdruck. So können wir alles in Ruhe besprechen, deine Werte anschauen und die Infusion in dem Tempo geben, das für dich passt. Es ist deine Zeit, und die soll sich gut anfühlen.",
    },
    foto: {
      tag: "So ist es bei uns",
      h2a: "Entspannt, persönlich, ", h2em: "menschlich", h2b: ".",
      text: "Eine Eiseninfusion muss sich nicht klinisch anfühlen. Bei uns sitzt du bequem, wir nehmen uns Zeit, und oft wird dabei auch gelacht. Genau so stelle ich mir gute Medizin vor: ärztlich sorgfältig und trotzdem menschlich.",
      img: "/Assets/eiseninfusion-praxis.jpg",
      alt: "Shukri Jarmoukli bei einer Eiseninfusion mit einer Patientin in der ViveCura-Praxis in Berlin",
      caption: "Eine Eiseninfusion in unserer Praxis in Berlin.",
    },
    wissen: {
      tag: "Zum Weiterlesen",
      h2a: "Dein Eisen-", h2em: "Ratgeber", h2b: ".",
      lead: "Viele ausführliche Artikel rund um Eisen, Ferritin und Infusionen, verständlich erklärt, für alle, die tiefer einsteigen möchten.",
      cards: [
        { ic: IC.book, t: "Alle Eisen-Artikel", p: "Der komplette Ratgeber mit allen Themen rund um Eisenmangel und Eiseninfusion.", to: "/blog/thema/eisen" },
        { ic: IC.file, t: "Eisenmangel und Eiseninfusionen", p: "Der große Überblick: Werte, Symptome, Behandlung und wann eine Infusion sinnvoll ist.", to: "/blog/eisenmangel-und-eiseninfusionen" },
      ],
      cta: "Zum ganzen Eisen-Ratgeber",
    },
    mentor: {
      tag: "Mehr als eine Infusion",
      h2a: "Ich fülle nicht nur ", h2em: "auf", h2b: ", ich begleite.",
      p: "Eisen ist Teil eines größeren Bildes. Wir behalten deine Werte im Blick, passen bei Bedarf an und bleiben an den Ursachen dran, damit der Mangel nicht einfach wiederkommt. Du bekommst keine Infusion von der Stange, sondern eine Begleitung, die zu dir passt.",
    },
    closing: {
      h2a: "Bereit, deinem Eisen auf den ", h2em: "Grund", h2b: " zu gehen?",
      p: "Vereinbare einen Termin. Wir schauen uns deine Werte an, suchen die Ursache und finden gemeinsam heraus, ob eine Eiseninfusion für dich der richtige Weg ist.",
      cta: "Termin bei ViveCura vereinbaren", addr: "ViveCura · Skalitzer Straße 137 · 10999 Berlin",
    },
    compliance: "Die Angaben auf dieser Seite dienen der allgemeinen Information und ersetzen keine persönliche ärztliche Beratung, Diagnose oder Behandlung. Ob eine Eiseninfusion für dich sinnvoll und geeignet ist, klären wir individuell im Gespräch und nach Untersuchung. Genannte Preise sind Richtwerte und können je nach Präparat und Dosis abweichen. Eine bestimmte Wirkung oder Heilung wird nicht versprochen.",
  },
};

/* ---------------- HTML-Aufbau ---------------- */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildBody(c) {
  const subnavHtml = c.subnav
    .map((n) => `<a href="${n.to}">${esc(n.label)}</a>`)
    .join("");

  const sympHtml = c.symptome.cards
    .map((s) => `<div class="card"><div class="ic">${s.ic}</div><h4>${esc(s.t)}</h4><p>${esc(s.p)}</p></div>`)
    .join("");

  const werteHtml = c.werte.cards
    .map((w) => `<div class="card"><div class="ic">${w.ic}</div><h4>${esc(w.t)}</h4><p>${esc(w.p)}</p></div>`)
    .join("");

  const ursHtml = c.ursachen.cards
    .map(
      (u) =>
        `<div class="fcard"><div class="ic">${u.ic}</div><h4>${esc(u.t)}</h4><ul>` +
        u.items.map((it) => `<li>${esc(it)}</li>`).join("") +
        `</ul></div>`
    )
    .join("");

  const duoHtml = c.duo.cards
    .map(
      (d) =>
        `<div class="duoc${d.hi ? " hi" : ""}"><span class="duo-tag">${esc(d.tag)}</span><h4>${esc(d.t)}</h4><p>${esc(d.p)}</p></div>`
    )
    .join("");

  const stepsHtml = c.ablauf.steps
    .map((m) => `<div class="mcard"><div class="step">${m.step}</div><h4>${esc(m.name)}</h4><p>${esc(m.text)}</p></div>`)
    .join("");

  const nrPointsHtml = c.nutzenrisiko.points
    .map((p) => `<li>${IC.scale}<span>${esc(p)}</span></li>`)
    .join("");

  const nutzenHtml = c.nebenwirkungen.nutzen
    .map((n) => `<li>${CHECK}<span>${esc(n)}</span></li>`)
    .join("");

  const nwHtml = c.nebenwirkungen.nw
    .map((n) => `<div class="nw-row"><div class="nw-freq"><span class="nw-f">${esc(n.f)}</span><span class="nw-h">${esc(n.h)}</span></div><div class="nw-t">${esc(n.t)}</div></div>`)
    .join("");

  const prepHtml = c.praeparate.cards
    .map(
      (p, i) =>
        `<div class="pkg${i === 1 ? " open" : ""}">` +
          `<div class="pkg-head">` +
            `<span class="pkg-ic">${IC.droplet}</span>` +
            `<div class="pkg-ti"><h4>${esc(p.name)}</h4><div class="pkg-for">${esc(p.forwho)}</div></div>` +
            `<div class="pkg-price">${esc(p.dose)}</div>` +
            `<span class="pkg-chev">${CHEV}</span>` +
          `</div>` +
          `<div class="pkg-body"><div class="pkg-body-in">` +
            `<div class="pkg-benefit">${esc(p.benefit)}</div>` +
          `</div></div>` +
        `</div>`
    )
    .join("");

  const kostenValueHtml = c.kosten.value
    .map((v) => `<div class="vcard"><span class="vic">${v.ic}</span><span>${esc(v.t)}</span></div>`)
    .join("");

  const kostenHtml = c.kosten.cards
    .map(
      (k) =>
        `<div class="price-card"><span class="pc-tag">${esc(k.tag)}</span><div class="pc-name">${esc(k.name)}</div>` +
        `<div class="pc-amount">${esc(k.amount)}</div><p class="pc-note">${esc(k.note)}</p></div>`
    )
    .join("");

  const wissenHtml = c.wissen.cards
    .map(
      (w) =>
        `<a class="fcard link" href="${w.to}"><div class="ic">${w.ic}</div><h4>${esc(w.t)}</h4><p>${esc(w.p)}</p><span class="fcard-go">Lesen ${ARROW}</span></a>`
    )
    .join("");

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
        <a class="btn btn-primary" href="${BOOK}" target="_blank" rel="noreferrer">${esc(c.hero.cta)} ${ARROW}</a>
        <a class="btn btn-ghost" href="#kosten">${esc(c.hero.ghost)}</a>
      </div>
    </div>
  </header>

  <nav class="subnav"><div class="wrap">${subnavHtml}</div></nav>

  <section class="sec symptome" id="symptome">
    <div class="wrap">
      <span class="sec-tag">${esc(c.symptome.tag)}</span>
      <h2 class="sec-h">${esc(c.symptome.h2a)}<em>${esc(c.symptome.h2em)}</em>${esc(c.symptome.h2b)}</h2>
      <p class="sec-lead">${esc(c.symptome.lead)}</p>
      <div class="cardgrid">${sympHtml}</div>
      <div class="sec-foot">${esc(c.symptome.foot)}</div>
    </div>
  </section>

  <section class="sec werte" id="werte">
    <div class="wrap">
      <span class="sec-tag">${esc(c.werte.tag)}</span>
      <h2 class="sec-h">${esc(c.werte.h2a)}<em>${esc(c.werte.h2em)}</em>${esc(c.werte.h2b)}</h2>
      <p class="sec-lead">${esc(c.werte.lead)}</p>
      <div class="cardgrid three">${werteHtml}</div>
    </div>
  </section>

  <section class="sec ursachen" id="ursachen">
    <div class="wrap">
      <span class="sec-tag">${esc(c.ursachen.tag)}</span>
      <h2 class="sec-h">${esc(c.ursachen.h2a)}<em>${esc(c.ursachen.h2em)}</em>${esc(c.ursachen.h2b)}</h2>
      <p class="sec-lead">${esc(c.ursachen.lead)}</p>
      <div class="fgrid">${ursHtml}</div>
      <div class="sec-foot">${esc(c.ursachen.foot)}</div>
    </div>
  </section>

  <section class="sec duo" id="tablette-infusion">
    <div class="wrap">
      <span class="sec-tag">${esc(c.duo.tag)}</span>
      <h2 class="sec-h">${esc(c.duo.h2a)}<em>${esc(c.duo.h2em)}</em>${esc(c.duo.h2b)}</h2>
      <p class="sec-lead">${esc(c.duo.lead)}</p>
      <div class="duogrid">${duoHtml}</div>
    </div>
  </section>

  <section class="sec tempo" id="tempo">
    <div class="wrap">
      <span class="sec-tag">${esc(c.tempo.tag)}</span>
      <h2 class="sec-h">${esc(c.tempo.h2a)}<em>${esc(c.tempo.h2em)}</em>${esc(c.tempo.h2b)}</h2>
      <p class="sec-lead">${esc(c.tempo.lead)}</p>
      <p class="tempo-body">${esc(c.tempo.body)}</p>
      <div class="sec-foot">${esc(c.tempo.note)}</div>
    </div>
  </section>

  <section class="sec ablauf" id="ablauf">
    <div class="wrap">
      <span class="sec-tag">${esc(c.ablauf.tag)}</span>
      <h2 class="sec-h">${esc(c.ablauf.h2a)}<em>${esc(c.ablauf.h2em)}</em>${esc(c.ablauf.h2b)}</h2>
      <p class="sec-lead">${esc(c.ablauf.lead)}</p>
      <div class="mgrid">${stepsHtml}</div>
      <div class="mfoot"><span class="pill">Und danach</span><span>${esc(c.ablauf.foot)}</span></div>
    </div>
  </section>

  <section class="sec nebenwirkungen" id="nebenwirkungen">
    <div class="wrap">
      <span class="sec-tag">${esc(c.nebenwirkungen.tag)}</span>
      <h2 class="sec-h">${esc(c.nebenwirkungen.h2a)}<em>${esc(c.nebenwirkungen.h2em)}</em>${esc(c.nebenwirkungen.h2b)}</h2>
      <p class="sec-lead">${esc(c.nebenwirkungen.lead)}</p>
      <div class="waage">
        <div class="waage-col nutzen-col">
          <div class="waage-title">${esc(c.nebenwirkungen.nutzenTitle)}</div>
          <ul class="nutzen-list">${nutzenHtml}</ul>
          <div class="nutzen-note">${esc(c.nebenwirkungen.nutzenNote)}</div>
        </div>
        <div class="waage-col nw-col">
          <div class="waage-title">${esc(c.nebenwirkungen.nwTitle)}</div>
          <div class="nw-list">${nwHtml}</div>
        </div>
      </div>
      <div class="nw-reframe">${esc(c.nebenwirkungen.reframe)}</div>
    </div>
  </section>

  <section class="sec nutzenrisiko" id="nutzenrisiko">
    <div class="wrap">
      <span class="sec-tag">${esc(c.nutzenrisiko.tag)}</span>
      <h2 class="sec-h">${esc(c.nutzenrisiko.h2a)}<em>${esc(c.nutzenrisiko.h2em)}</em>${esc(c.nutzenrisiko.h2b)}</h2>
      <p class="sec-lead">${esc(c.nutzenrisiko.lead)}</p>
      <div class="nr-box"><ul>${nrPointsHtml}</ul></div>
      <div class="sec-foot">${esc(c.nutzenrisiko.foot)}</div>
    </div>
  </section>

  <section class="sec praeparate" id="praeparate">
    <div class="wrap">
      <span class="sec-tag">${esc(c.praeparate.tag)}</span>
      <h2 class="sec-h">${esc(c.praeparate.h2a)}<em>${esc(c.praeparate.h2em)}</em>${esc(c.praeparate.h2b)}</h2>
      <p class="sec-lead">${esc(c.praeparate.lead)}</p>
      <div class="pkg-grid" id="prepGrid">${prepHtml}</div>
      <div class="prep-allin">${esc(c.praeparate.allin)}</div>
    </div>
  </section>

  <section class="sec rufsec">
    <div class="wrap">
      <div class="trenn">
        <span class="tt">${esc(c.ruf.tag)}</span>
        <h3>${esc(c.ruf.h3a)}<em>${esc(c.ruf.h3em)}</em>${esc(c.ruf.h3b)}</h3>
        <p>${esc(c.ruf.p)}</p>
      </div>
    </div>
  </section>

  <section class="sec kosten" id="kosten">
    <div class="wrap">
      <span class="sec-tag">${esc(c.kosten.tag)}</span>
      <h2 class="sec-h">${esc(c.kosten.h2a)}<em>${esc(c.kosten.h2em)}</em>${esc(c.kosten.h2b)}</h2>
      <p class="sec-lead">${esc(c.kosten.lead)}</p>
      <div class="honorar-note"><span class="ic">${IC.shield}</span><span>${c.kosten.honorar}</span></div>
      <div class="value-box">
        <div class="value-title">${esc(c.kosten.valueTitle)}</div>
        <div class="value-grid">${kostenValueHtml}</div>
      </div>
      <div class="stunde-note"><span class="ic">${IC.gauge}</span><span>${c.kosten.stunde}</span></div>
      <div class="price-grid">${kostenHtml}</div>
      <div class="kasse-box">
        <div class="value-title">${esc(c.kosten.kasseTitle)}</div>
        <p>${esc(c.kosten.kasse)}</p>
      </div>
      <div class="vergleich-box">
        <div class="vergleich-title">${esc(c.kosten.vergleichTitle)}</div>
        <p>${esc(c.kosten.vergleich)}</p>
      </div>
      <div class="sec-foot">${esc(c.kosten.foot)}</div>
    </div>
  </section>

  <section class="sec zeit" id="zeit">
    <div class="wrap">
      <span class="sec-tag">${esc(c.zeit.tag)}</span>
      <h2 class="sec-h">${esc(c.zeit.h2a)}<em>${esc(c.zeit.h2em)}</em>${esc(c.zeit.h2b)}</h2>
      <p class="sec-lead">${esc(c.zeit.lead)}</p>
      <p class="tempo-body">${esc(c.zeit.body)}</p>
    </div>
  </section>

  <section class="sec foto">
    <div class="wrap">
      <div class="foto-in">
        <figure class="foto-fig">
          <img src="${c.foto.img}" alt="${esc(c.foto.alt)}" loading="lazy" />
          <figcaption>${esc(c.foto.caption)}</figcaption>
        </figure>
        <div class="foto-txt">
          <span class="tt">${esc(c.foto.tag)}</span>
          <h2>${esc(c.foto.h2a)}<em>${esc(c.foto.h2em)}</em>${esc(c.foto.h2b)}</h2>
          <p>${esc(c.foto.text)}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="sec wissen" id="wissen">
    <div class="wrap">
      <span class="sec-tag">${esc(c.wissen.tag)}</span>
      <h2 class="sec-h">${esc(c.wissen.h2a)}<em>${esc(c.wissen.h2em)}</em>${esc(c.wissen.h2b)}</h2>
      <p class="sec-lead">${esc(c.wissen.lead)}</p>
      <div class="wissen-grid">${wissenHtml}</div>
      <a class="btn btn-ghost wissen-cta" href="/blog/thema/eisen">${esc(c.wissen.cta)} ${ARROW}</a>
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
      <a class="btn btn-white" href="${BOOK}" target="_blank" rel="noreferrer">${esc(c.closing.cta)} ${ARROW}</a>
      <div class="addr">${esc(c.closing.addr)}</div>
    </div>
  </section>

  <div class="compl-wrap"><p class="compl">${esc(c.compliance)}</p></div>
  `;
}

/* ---------------- Interaktivität ---------------- */
function initEisen(root) {
  const prepGrid = root.querySelector("#prepGrid");
  if (prepGrid) {
    prepGrid.addEventListener("click", (e) => {
      const head = e.target && e.target.closest ? e.target.closest(".pkg-head") : null;
      if (head) head.parentNode.classList.toggle("open");
    });
  }
  // Sprung-Navigation (Subnav + "Was kostet das?"): sanft zum Abschnitt scrollen
  root.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      if (!id) return;
      const target = root.querySelector("#" + id) || document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/* ---------------- Komponente ---------------- */
export default function Eiseninfusion() {
  const lang = useLanguage();
  const c = CONTENT[lang] || CONTENT.de;
  const ref = useRef(null);
  const body = buildBody(c);

  useEffect(() => {
    if (ref.current) initEisen(ref.current);
  }, [lang]);

  return (
    <div className="ei">
      <style dangerouslySetInnerHTML={{ __html: EI_CSS }} />
      <div ref={ref} dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}

/* ---------------- Gekapseltes CSS (alle Regeln unter .ei) ---------------- */
const EI_CSS = `
.ei{
  --teal:#43a9ab;--teal-dark:#2d8789;--teal-darker:#1f6e70;--teal-pale:#e0f4f5;--teal-subtle:#f3faf9;
  --charcoal:#1a1f24;--gray:#515757;--gray-soft:#8a9a9a;--line:#e2eeee;--cream:#f5f3ed;
  --sans:var(--font-plus-jakarta),system-ui,sans-serif;--serif:var(--font-libre-baskerville),Georgia,serif;
  --ease:cubic-bezier(.22,1,.36,1);--spring:cubic-bezier(.34,1.4,.5,1);
  font-family:var(--sans);color:var(--charcoal);line-height:1.6;-webkit-font-smoothing:antialiased;background:#fff;overflow-x:hidden;
}
.ei *{box-sizing:border-box}
.ei .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.ei .btn{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:1rem;padding:15px 28px;border-radius:100px;text-decoration:none;cursor:pointer;border:none;transition:.3s var(--ease)}
.ei .btn-primary{color:#fff;background:var(--teal);box-shadow:0 14px 32px -14px rgba(67,169,171,.8)}
.ei .btn-primary:hover{background:var(--teal-dark);transform:translateY(-2px)}
.ei .btn-ghost{color:var(--teal-darker);background:#fff;border:1.5px solid var(--line)}
.ei .btn-ghost:hover{border-color:var(--teal);background:var(--teal-subtle)}
.ei .btn-white{background:#fff;color:var(--teal-darker)}
.ei .btn-white:hover{background:var(--cream);transform:translateY(-2px)}
.ei .arrow{transition:transform .3s var(--ease)}
.ei .btn-primary:hover .arrow,.ei .btn-white:hover .arrow{transform:translateX(4px)}

.ei .hero{position:relative;padding:70px 0 56px;overflow:hidden;background:radial-gradient(120% 90% at 86% -10%,var(--teal-pale) 0%,rgba(224,244,245,0) 55%),radial-gradient(90% 70% at -5% 110%,var(--teal-subtle) 0%,rgba(243,250,249,0) 60%)}
.ei .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-darker);background:#fff;border:1.5px solid var(--line);padding:8px 16px;border-radius:100px}
.ei .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.ei .hero-h{font-size:clamp(2.4rem,5.6vw,4.2rem);line-height:1.03;letter-spacing:-.035em;font-weight:800;margin:24px 0 0;max-width:16ch}
.ei .hero-h em{font-family:var(--serif);font-weight:400;font-style:italic;color:var(--teal-darker)}
.ei .hero-sub{font-size:clamp(1.05rem,1.6vw,1.25rem);color:var(--gray);max-width:52ch;margin:24px 0 0}
.ei .usp-band{margin:30px 0 0;border-left:3px solid var(--teal);padding:4px 0 4px 20px}
.ei .usp-strike{font-family:var(--serif);font-style:italic;font-size:1.08rem;color:var(--gray-soft);text-decoration:line-through;text-decoration-thickness:1.5px}
.ei .usp-plan{font-family:var(--serif);font-style:italic;font-size:1.5rem;color:var(--charcoal);margin-top:3px}
.ei .usp-plan b{font-style:normal;font-weight:700;color:var(--teal-darker)}
.ei .hero-actions{margin:36px 0 0;display:flex;flex-wrap:wrap;gap:13px}

.ei .subnav{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ei .subnav .wrap{display:flex;gap:8px;flex-wrap:wrap;padding:14px 24px;justify-content:center}
.ei .subnav a{font-size:.86rem;font-weight:600;color:var(--gray);text-decoration:none;padding:8px 15px;border-radius:100px;border:1px solid var(--line);background:#fff;transition:.25s var(--ease);white-space:nowrap}
.ei .subnav a:hover{color:var(--teal-darker);border-color:var(--teal);background:var(--teal-subtle)}

.ei .sec{padding:74px 0;scroll-margin-top:64px}
.ei .sec-tag{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px}
.ei .sec-h{font-size:clamp(2rem,3.7vw,2.9rem);line-height:1.07;letter-spacing:-.03em;font-weight:800;max-width:22ch;margin:0}
.ei .sec-h em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal-darker)}
.ei .sec-lead{font-size:1.12rem;color:var(--gray);max-width:60ch;margin-top:16px}
.ei .sec-foot{margin-top:30px;font-family:var(--serif);font-style:italic;font-size:1.02rem;color:var(--gray);max-width:64ch;border-left:3px solid var(--teal-pale);padding-left:18px}

.ei .symptome{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.ei .cardgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.ei .cardgrid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:900px){.ei .cardgrid,.ei .cardgrid.three{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.ei .cardgrid,.ei .cardgrid.three{grid-template-columns:1fr}}
.ei .card{border:1px solid var(--line);border-radius:20px;padding:26px 24px;background:#fff;transition:.4s var(--ease)}
.ei .card:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 28px 56px -40px rgba(31,110,112,.5)}
.ei .card .ic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:16px}
.ei .card h4{font-size:1.12rem;font-weight:700;letter-spacing:-.01em;margin:0}
.ei .card p{font-size:.92rem;color:var(--gray);line-height:1.6;margin-top:8px;overflow-wrap:break-word}

.ei .werte{background:#fff}

.ei .ursachen{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ei .fgrid{margin-top:44px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:900px){.ei .fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.ei .fgrid{grid-template-columns:1fr}}
.ei .fcard{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff;transition:.4s var(--ease);text-decoration:none;color:inherit;display:block}
.ei .fcard:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 24px 50px -38px rgba(31,110,112,.55)}
.ei .fcard .ic{width:44px;height:44px;border-radius:12px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;margin-bottom:14px}
.ei .fcard h4{font-size:1.08rem;font-weight:700;letter-spacing:-.01em;margin:0 0 12px}
.ei .fcard ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.ei .fcard li{display:flex;align-items:flex-start;gap:9px;font-size:.92rem;color:var(--gray);line-height:1.45}
.ei .fcard li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--teal);margin-top:7px}
.ei .fcard.link p{font-size:.92rem;color:var(--gray);line-height:1.55;margin:0 0 14px}
.ei .fcard-go{display:inline-flex;align-items:center;gap:7px;font-size:.86rem;font-weight:700;color:var(--teal-darker)}

.ei .duo{background:#fff}
.ei .duogrid{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:760px){.ei .duogrid{grid-template-columns:1fr}}
.ei .duoc{border:1px solid var(--line);border-radius:22px;padding:30px 28px;background:#fff}
.ei .duoc.hi{border-color:var(--teal);background:var(--teal-subtle);box-shadow:0 30px 64px -44px rgba(31,110,112,.55)}
.ei .duo-tag{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--gray-soft);margin-bottom:10px}
.ei .duoc.hi .duo-tag{color:var(--teal)}
.ei .duoc h4{font-size:1.3rem;font-weight:800;letter-spacing:-.02em;margin:0 0 10px}
.ei .duoc p{font-size:.98rem;color:var(--gray);line-height:1.62;margin:0}

.ei .tempo{background:#fff}
.ei .tempo-body{margin-top:20px;font-size:1.08rem;color:var(--gray);max-width:62ch;line-height:1.75}

.ei .ablauf{background:linear-gradient(180deg,var(--teal-subtle),#fff)}
.ei .mgrid{margin-top:44px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.ei .mgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.ei .mgrid{grid-template-columns:1fr}}
.ei .mcard{border:1px solid var(--line);border-radius:20px;padding:26px 22px;background:#fff;transition:.4s var(--ease);position:relative}
.ei .mcard:hover{border-color:var(--teal);transform:translateY(-5px);box-shadow:0 28px 56px -40px rgba(31,110,112,.6)}
.ei .mcard .step{font-family:var(--serif);font-size:1.6rem;color:var(--teal-pale);position:absolute;top:16px;right:22px}
.ei .mcard h4{font-size:1.05rem;font-weight:700;margin-top:6px;max-width:12ch}
.ei .mcard p{font-size:.88rem;color:var(--gray);margin-top:10px;line-height:1.55}
.ei .mfoot{margin-top:32px;font-size:.98rem;color:var(--gray);display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;line-height:1.6}
.ei .mfoot .pill{font-weight:700;color:var(--teal-darker);background:var(--teal-pale);padding:7px 15px;border-radius:100px;font-size:.9rem;flex:none}
.ei .mfoot>span:last-child{max-width:70ch}

.ei .nutzenrisiko{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ei .nr-box{margin-top:36px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:26px 28px}
.ei .nr-box ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:15px}
.ei .nr-box li{display:flex;align-items:flex-start;gap:13px;font-size:1.04rem;color:var(--charcoal);line-height:1.5;font-weight:600}
.ei .nr-box li svg{color:var(--teal);flex:none;margin-top:1px}

.ei .praeparate{background:#fff}
.ei .pkg-grid{margin-top:40px;display:flex;flex-direction:column;gap:14px}
.ei .pkg{border:1px solid var(--line);border-radius:20px;background:#fff;overflow:hidden;transition:border-color .3s var(--ease),box-shadow .3s var(--ease)}
.ei .pkg.open{border-color:var(--teal);box-shadow:0 26px 54px -36px rgba(31,110,112,.6)}
.ei .pkg-head{display:flex;align-items:center;gap:15px;padding:19px 22px;cursor:pointer;user-select:none;transition:background .3s var(--ease)}
.ei .pkg-head:hover{background:var(--teal-subtle)}
.ei .pkg-ic{width:46px;height:46px;border-radius:13px;background:var(--teal-pale);color:var(--teal-darker);display:grid;place-items:center;flex:none}
.ei .pkg-ti{flex:1;min-width:0}
.ei .pkg-ti h4{font-size:1.12rem;font-weight:700;letter-spacing:-.01em;margin:0}
.ei .pkg-for{font-size:.85rem;color:var(--gray-soft);margin-top:3px;line-height:1.4}
.ei .pkg-price{font-family:var(--serif);font-size:1.16rem;color:var(--teal-darker);white-space:nowrap;flex:none}
.ei .pkg-chev{color:var(--gray-soft);flex:none;display:flex;transition:transform .4s var(--spring)}
.ei .pkg.open .pkg-chev{transform:rotate(180deg);color:var(--teal)}
.ei .pkg-body{max-height:0;overflow:hidden;transition:max-height .5s var(--ease)}
.ei .pkg.open .pkg-body{max-height:420px}
.ei .pkg-body-in{padding:2px 24px 24px}
.ei .pkg-benefit{font-size:.98rem;color:var(--gray);line-height:1.62;border-left:3px solid var(--teal-pale);padding-left:16px}
.ei .prep-allin{margin-top:22px;font-family:var(--serif);font-style:italic;font-size:1.02rem;color:var(--gray);text-align:center;max-width:60ch;margin-left:auto;margin-right:auto}

.ei .rufsec{background:linear-gradient(180deg,#fff,var(--teal-subtle));padding-top:20px}
.ei .trenn{background:var(--charcoal);color:#fff;border-radius:30px;padding:52px 48px;position:relative;overflow:hidden}
.ei .trenn::before{content:"";position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(67,169,171,.22),transparent 68%);top:-140px;right:-90px}
.ei .trenn .tt{position:relative;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px;display:inline-block}
.ei .trenn h3{position:relative;font-size:clamp(1.6rem,3vw,2.4rem);letter-spacing:-.02em;font-weight:800;max-width:26ch;line-height:1.14;margin:0}
.ei .trenn h3 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal)}
.ei .trenn>p{position:relative;color:rgba(255,255,255,.78);margin-top:16px;max-width:70ch;font-size:1.05rem;line-height:1.7}

.ei .kosten{background:var(--teal-subtle)}
.ei .honorar-note{margin-top:34px;font-size:.98rem;color:var(--gray);background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start;line-height:1.6;max-width:72ch}
.ei .honorar-note b{color:var(--charcoal)}
.ei .honorar-note .ic{color:var(--teal);flex:none;margin-top:1px}
.ei .value-box{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px 26px}
.ei .value-title{font-weight:700;font-size:1.05rem;color:var(--charcoal);margin-bottom:16px}
.ei .value-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.ei .value-list{grid-template-columns:1fr}}
.ei .value-list li{display:flex;align-items:flex-start;gap:11px;font-size:.96rem;color:var(--gray);line-height:1.5}
.ei .value-list li svg{color:var(--teal);flex:none;margin-top:3px}
.ei .value-grid{margin-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:640px){.ei .value-grid{grid-template-columns:1fr}}
.ei .vcard{display:flex;align-items:center;gap:13px;background:var(--teal-subtle);border:1px solid var(--line);border-radius:14px;padding:14px 16px;font-size:.95rem;color:var(--charcoal);line-height:1.4;transition:.3s var(--ease)}
.ei .vcard:hover{border-color:var(--teal);transform:translateY(-2px);box-shadow:0 18px 40px -30px rgba(31,110,112,.55)}
.ei .vcard .vic{width:36px;height:36px;border-radius:10px;background:#fff;color:var(--teal-darker);display:grid;place-items:center;flex:none}
.ei .vcard .vic svg{width:19px;height:19px}
.ei .stunde-note{margin-top:18px;font-size:.98rem;color:var(--gray);background:#fff;border:1px dashed var(--teal);border-radius:16px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start;line-height:1.6;max-width:72ch}
.ei .stunde-note b{color:var(--teal-darker)}
.ei .stunde-note .ic{color:var(--teal);flex:none;margin-top:1px}
.ei .kasse-box{margin-top:18px;background:var(--teal-subtle);border:1px solid var(--teal-pale);border-radius:18px;padding:24px 26px}
.ei .kasse-box p{margin:0;font-size:.99rem;color:var(--gray);line-height:1.68}
.ei .price-grid{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:760px){.ei .price-grid{grid-template-columns:1fr}}
.ei .price-card{border:1px solid var(--line);border-radius:22px;padding:30px 28px;background:#fff;transition:.4s var(--ease)}
.ei .price-card:hover{border-color:var(--teal);transform:translateY(-4px);box-shadow:0 30px 60px -44px rgba(31,110,112,.5)}
.ei .pc-tag{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin-bottom:10px}
.ei .pc-name{font-size:1.1rem;font-weight:700;color:var(--charcoal)}
.ei .pc-amount{font-family:var(--serif);font-size:2.6rem;line-height:1;letter-spacing:-.02em;color:var(--teal-darker);margin:12px 0 14px}
.ei .pc-note{font-size:.92rem;color:var(--gray);line-height:1.6;margin:0}
.ei .vergleich-box{margin-top:18px;background:var(--charcoal);color:#fff;border-radius:20px;padding:26px 28px}
.ei .vergleich-title{font-weight:700;font-size:1.1rem;color:#fff;margin-bottom:9px}
.ei .vergleich-box p{margin:0;color:rgba(255,255,255,.8);font-size:.99rem;line-height:1.68}

.ei .wissen{background:#fff}
.ei .wissen-grid{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:760px){.ei .wissen-grid{grid-template-columns:1fr}}
.ei .wissen-cta{margin-top:26px}

.ei .mentor{background:linear-gradient(180deg,#fff,var(--teal-subtle))}
.ei .mentor-in{background:linear-gradient(135deg,var(--teal-darker),var(--teal-dark) 60%,var(--teal));border-radius:28px;padding:48px 44px;color:#fff;position:relative;overflow:hidden}
.ei .mentor-in::before{content:"";position:absolute;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 70%);top:-120px;right:-80px}
.ei .mentor-in .tt{position:relative;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#bfe3e3;display:inline-block;margin-bottom:12px}
.ei .mentor-in h2{position:relative;font-size:clamp(1.6rem,3vw,2.3rem);font-weight:800;letter-spacing:-.02em;max-width:24ch;line-height:1.14;margin:0}
.ei .mentor-in h2 em{font-family:var(--serif);font-style:italic;font-weight:400}
.ei .mentor-in p{position:relative;color:rgba(255,255,255,.85);margin-top:14px;max-width:64ch;font-size:1.05rem;line-height:1.6}

.ei .closing{background:linear-gradient(160deg,var(--teal-darker),var(--teal-dark) 55%,var(--teal));color:#fff;position:relative;overflow:hidden}
.ei .closing .wrap{text-align:center;padding:92px 24px}
.ei .closing h2{font-size:clamp(2rem,3.8vw,3rem);font-weight:800;letter-spacing:-.03em;margin:0}
.ei .closing h2 em{font-family:var(--serif);font-style:italic;font-weight:400}
.ei .closing p{color:rgba(255,255,255,.86);margin:18px auto 0;max-width:52ch;font-size:1.08rem}
.ei .closing .btn-white{margin-top:34px}
.ei .closing .addr{margin-top:30px;font-size:.94rem;color:rgba(255,255,255,.82)}

.ei .compl-wrap{padding:40px 24px 12px;text-align:center;background:#fff}
.ei .compl{margin:0 auto;max-width:68ch;font-size:.78rem;color:var(--gray-soft);line-height:1.65}

.ei .nebenwirkungen{background:#fff}
.ei .waage{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:820px){.ei .waage{grid-template-columns:1fr}}
.ei .waage-col{border:1px solid var(--line);border-radius:20px;padding:26px 24px}
.ei .nutzen-col{background:var(--teal-subtle);border-color:var(--teal-pale)}
.ei .nw-col{background:#fff}
.ei .waage-title{font-weight:700;font-size:1.05rem;color:var(--charcoal);margin-bottom:16px}
.ei .nutzen-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
.ei .nutzen-list li{display:flex;align-items:flex-start;gap:10px;font-size:.97rem;color:var(--charcoal);line-height:1.45}
.ei .nutzen-list li svg{color:var(--teal);flex:none;margin-top:3px}
.ei .nutzen-note{margin-top:18px;font-family:var(--serif);font-style:italic;font-size:.95rem;color:var(--gray);line-height:1.55}
.ei .nw-list{display:flex;flex-direction:column;gap:15px}
.ei .nw-row{border-left:3px solid var(--teal-pale);padding-left:15px}
.ei .nw-freq{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.ei .nw-f{font-weight:700;font-size:.95rem;color:var(--teal-darker)}
.ei .nw-h{font-size:.82rem;color:var(--gray-soft)}
.ei .nw-t{font-size:.93rem;color:var(--gray);line-height:1.5}
.ei .nw-erklaer{margin-top:30px;font-size:1rem;color:var(--gray);line-height:1.7;max-width:76ch}
.ei .nw-reframe{margin-top:20px;background:var(--charcoal);color:#fff;border-radius:18px;padding:24px 28px;font-size:1.02rem;line-height:1.65}

.ei .zeit{background:linear-gradient(180deg,var(--teal-subtle),#fff)}

.ei .foto{background:#fff}
.ei .foto-in{display:grid;grid-template-columns:1fr 1fr;gap:34px;align-items:center}
@media(max-width:820px){.ei .foto-in{grid-template-columns:1fr;gap:24px}}
.ei .foto-fig{margin:0}
.ei .foto-fig img{width:100%;height:auto;border-radius:22px;display:block;background:var(--teal-subtle);min-height:260px;object-fit:cover;box-shadow:0 30px 60px -40px rgba(31,110,112,.5)}
.ei .foto-fig figcaption{margin-top:12px;font-family:var(--serif);font-style:italic;font-size:.92rem;color:var(--gray-soft);text-align:center}
.ei .foto-txt .tt{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:12px}
.ei .foto-txt h2{font-size:clamp(1.7rem,3vw,2.4rem);font-weight:800;letter-spacing:-.02em;line-height:1.12;margin:0}
.ei .foto-txt h2 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--teal-darker)}
.ei .foto-txt p{margin-top:16px;font-size:1.05rem;color:var(--gray);line-height:1.7}

/* ---- Handy-Feinschliff ---- */
@media(max-width:600px){
  .ei .sec{padding:50px 0}
  .ei .wrap{padding:0 18px}
  .ei .hero{padding:46px 0 38px}
  .ei .hero-h{letter-spacing:-.025em}
  .ei .hero-sub{font-size:1.05rem}
  .ei .usp-plan{font-size:1.28rem}
  .ei .hero-actions{gap:10px}
  .ei .hero-actions .btn{width:100%;justify-content:center}
  .ei .subnav .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:14px 16px}
  .ei .subnav a{padding:10px 8px;font-size:.78rem;line-height:1.2;text-align:center;white-space:normal;min-width:0;min-height:44px;display:flex;align-items:center;justify-content:center}
  .ei .subnav a:last-child{grid-column:1 / -1}
  .ei .sec-h{font-size:clamp(1.7rem,7vw,2.1rem)}
  .ei .sec-lead{font-size:1.04rem}
  .ei .sec-foot{padding-left:15px}
  .ei .cardgrid,.ei .fgrid{margin-top:30px;gap:14px}
  .ei .card,.ei .fcard{padding:22px 20px}
  .ei .duoc{padding:26px 22px}
  .ei .mgrid{margin-top:30px;gap:12px}
  .ei .mcard{padding:22px 20px}
  .ei .mcard h4{max-width:none}
  .ei .mfoot{gap:10px}
  .ei .trenn{padding:34px 24px;border-radius:22px}
  .ei .trenn::before{width:260px;height:260px;top:-90px;right:-70px}
  .ei .mentor-in{padding:34px 26px;border-radius:22px}
  .ei .waage{margin-top:30px;gap:14px}
  .ei .waage-col{padding:22px 20px}
  .ei .nw-reframe{padding:22px 22px}
  .ei .nr-box{padding:22px 20px}
  .ei .value-box{padding:22px 20px}
  .ei .kasse-box{padding:22px 20px}
  .ei .honorar-note,.ei .stunde-note{padding:16px 16px}
  .ei .vergleich-box{padding:24px 22px}
  .ei .price-card{padding:26px 22px}
  .ei .pc-amount{font-size:2.3rem}
  .ei .foto-in{gap:20px}
  .ei .foto-fig img{min-height:0;border-radius:18px}
  .ei .closing .wrap{padding:66px 20px}
  .ei .compl-wrap{padding:34px 18px 12px}
}
@media(max-width:380px){
  .ei .wrap{padding:0 15px}
  .ei .hero-h{font-size:2.15rem}
  .ei .sec-h{font-size:1.6rem}
}
`;
