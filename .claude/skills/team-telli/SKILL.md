---
name: team-telli
description: Aufgaben und Ideen an Telli (Praxisassistentin, ClickUp-Konto „Chantelle Ternes“) als ClickUp-Aufgaben im Space „Team Telli“ anlegen und ihren Stand abgleichen. Nutzen, wenn Shukri „Telli: …“, „Für Telli …“, „Telli soll …“, „Sag Telli …“, „Idee für Telli …“, „Was gibt's von Telli?“ oder „Telli-Status“ schreibt, oder Todos, Ideen zu Behandlungen, Räumen und Abläufen für seine Praxisassistentin nennt.
---

# Skill: Team Telli (Aufgaben und Ideen an die Praxisassistenz)

> Telli (ClickUp-Konto „Chantelle Ternes“) ist Shukris Praxisassistentin. Sie arbeitet mit ihm am Patienten, und Shukri teilt mit ihr Ideen zu Behandlungen, Räumen und Abläufen. Shukri sagt in Claude, was Telli tun soll oder welche Idee er hat. Daraus wird eine fertige ClickUp-Aufgabe im Space „Team Telli“, zugewiesen an Telli. Umgekehrt holt Claude auf Zuruf, was bei Telli fertig ist und was auf Shukri wartet, und schreibt Shukris Entscheidungen zurück.

**ClickUp ist die einzige Wahrheit für Telli-Aufgaben.** Claude liest und schreibt live über den Connector, es gibt keine lokale Kopie.

Vorbild ist der Skill `team-hamze` (gleicher Ablauf, eigener Space). Telli-Aufgaben nie im Space „Team Hamze“ anlegen und umgekehrt.

## IDs (Stand 2026-10-17)

| Was | ID |
|---|---|
| Workspace | `90121612085` |
| Space „Team Telli“ | `1500400000000166` |
| ✅ Aufgaben | `1500400000000735` |
| 💡 Ideen & Projekte | `1500400000000738` |
| 🩺 Behandlungen & Patienten | `1500400000000739` |
| 📦 Material & Bestellungen | `1500400000000740` |
| 💬 Für Shukri (Telli an Shukri) | `1500400000000741` |
| Shukri (User-ID) | `290603002` |
| Telli (User-ID) | `105711117` (ClickUp-Konto „Chantelle Ternes“; Shukri schreibt „Telli“, beides ist gemeint) |

Status (für alle Listen gleich, ClickUp-Standard, kleingeschrieben an die API übergeben): `to do` → `in progress` → `complete`.
Anders als bei Hamze gibt es (noch) keine eigenen Status für Rückfrage oder Freigabe. Ersatz: Telli schreibt einen Kommentar mit @Shukri, Claude findet ihn im Abgleich. Stellt Shukri in der ClickUp-App deutsche Status wie bei Hamze ein (Space, Einstellungen, Status), diesen Absatz und Modus B anpassen. Der Connector selbst kann keine Status ändern.

---

## Modus A: Aufgabe oder Idee an Telli („Telli: …“)

### 1. Liste wählen (nicht nachfragen, außer es ist wirklich unklar)

| Signalwörter | Liste |
|---|---|
| Idee, Vorschlag, „wäre schön“, verbessern, umgestalten, einrichten, Raum, Zimmer, Deko, Atmosphäre, Vibe, Ablauf, Projekt, allgemeine Behandlungsidee ohne bestimmte Person | 💡 Ideen & Projekte |
| Behandlung vor- oder nachbereiten für eine bestimmte Person, Patient, Patientin, Termin, Blutabnahme, Probe, Befund anfordern, Nachsorge | 🩺 Behandlungen & Patienten |
| bestellen, Material, nachfüllen, Vorrat, Lieferung, Verbrauchsmaterial, besorgen | 📦 Material & Bestellungen |
| alles andere (Organisation, Aufräumen, Recherche, interne Termine) | ✅ Aufgaben |

Bei Überschneidung: Nennt Shukri es „Idee“ oder geht es um Räume und Abläufe ohne bestimmte Person, dann 💡. Geht es um eine bestimmte Person, dann 🩺.
Mehrere Aufgaben in einem Satz („Telli soll A und B“) = mehrere Aufgaben.

### 2. Titel

Listen-Emoji + Verb + Objekt, höchstens etwa 60 Zeichen. Beispiele: `💡 Laborzimmer als Ausweichraum für Infusionen herrichten`, `🩺 Behandlung vorbereiten: Anna M., Di 10:30`, `📦 Verbrauchsmaterial für Infusionen nachbestellen`.

### 3. Fälligkeit und Priorität

- Nennt Shukri ein Datum („bis Freitag“, „morgen“), gilt das.
- Sonst Standard (Werktage Mo bis Fr, Zeitzone Berlin): Behandlungen = nächster Werktag · Material = in 3 Werktagen · Aufgaben = in 3 Werktagen · Ideen & Projekte = in 10 Werktagen.
- „dringend“, „sofort“, „heute“ → heute + `urgent`. „wichtig“ → `high`. „wenn Zeit ist“, „irgendwann“ → `low`, ohne Datum. Sonst `normal`.

### 4. Beschreibung (immer dieser Aufbau, Du-Form an Telli)

```
**Ziel:** <ein Satz, was am Ende erreicht ist>

**Idee von Shukri**            (nur bei Ideen)
<Shukris Gedanke in 1 bis 3 Sätzen, nah an seinen Worten>

**Schritte**
- [ ] <konkreter Schritt>
- [ ] <…>

**Fertig, wenn:** <prüfbares Kriterium, zum Beispiel „Ergebnis oder Foto als Kommentar an @Shukri“>

**Rahmen:** <nur wenn Shukri Vorgaben macht: Budget, „so billig wie möglich“, was nicht passieren soll>

_Von Shukri über Claude, <TT.MM.JJJJ>_
```

Claude darf sinnvolle, praktische Teilschritte ergänzen (zum Beispiel: erst Vorschläge mit Kosten als Kommentar an @Shukri, nach seinem OK umsetzen). Keine medizinischen Anweisungen erfinden: Präparat, Dosis oder Ablauf am Patienten stehen nur drin, wenn Shukri sie selbst nennt, und dann ohne Personenbezug.

Zusätze je Liste:
- **💡 Ideen & Projekte:** Kosten- und Aufwandsrahmen, erst Vorschlag an @Shukri, dann umsetzen. Fertig, wenn: umgesetzt und Ergebnis oder Vorher-Nachher-Foto als Kommentar.
- **🩺 Behandlungen & Patienten:** Wer (Vorname + Anfangsbuchstabe, dazu Doctolib-Bezug wie „Termin am 21.10., 10:30“), was vorzubereiten ist, neutral formuliert („Behandlung vorbereiten“, „Raum herrichten“), Hinweis „Details in Doctolib bzw. im Behandlungsplan“.
- **📦 Material & Bestellungen:** Was, Menge, bis wann gebraucht, Bezugsquelle falls Shukri sie nennt. Fertig, wenn: bestellt und Liefertermin als Kommentar.

### 5. Datenschutz-Filter (PFLICHT vor jedem Anlegen)

ClickUp ist Zone 2 (siehe `_memory/project_praxis_operations.md`). Telli kennt die Patienten aus der Praxis und hat Schweigepflicht, trotzdem gehören Gesundheitsdaten nicht in ClickUp:

1. **Personen nur als Vorname + Anfangsbuchstabe** („Anna M.“), plus Doctolib-Bezug zum Nachschlagen. Volle Nachnamen, Geburtsdaten, Telefonnummern, E-Mail, Adressen, Versicherungsdaten: raus.
2. **Keine personenbezogenen Gesundheitsinfos:** Diagnosen, Befunde, Laborwerte, Medikamente, Dosierungen und die Therapieart einer bestimmten Person werden neutral ersetzt („Behandlung vorbereiten“, „Befund besprechen“). Die Details stehen in Doctolib bzw. im Behandlungsplan.
3. **Allgemeine Ideen ohne Personenbezug sind erlaubt**, auch zu Behandlungen (zum Beispiel „Infusionen im Laborzimmer geben“).
4. **Selbstcheck vor dem Senden:** Payload gegen den Nachnamen aus Shukris Satz, Ziffernfolgen ab 6 Stellen, Geburtsdaten und medizinische Begriffe in Verbindung mit einem Namen prüfen. 0 Treffer, sonst korrigieren.
5. **In der Bestätigung an Shukri eine Zeile**, was neutralisiert wurde („Nachname gekürzt, Medikament rausgenommen“).

### 6. Texte nach außen

Enthält die Aufgabe einen Text, den Telli an Patienten schickt, vorliest oder aushängt, läuft dieser Text vorher durch den Skill `lawyer-audit-universal` (falls verfügbar). Immer: kein „Dr.“, keine Gedankenstriche, keine Heilversprechen („kann“ statt „heilt“). Interne Aufgabenbeschreibungen brauchen das nicht.

### 7. Anlegen

`clickup_create_task` mit `list_id`, `name`, `markdown_description`, `priority`, `due_date`, `assignees: ["105711117"]`. Status nicht setzen (Standard `to do`).

### 8. Bestätigung an Shukri (kurz)

```
✅ An Telli: [💡 Laborzimmer als Ausweichraum für Infusionen herrichten](link) · fällig Fr 30.10.
   (Nachname gekürzt)        (nur wenn etwas neutralisiert wurde)
```

Keine Rückfrage, außer die Liste oder das Ziel ist wirklich nicht erkennbar. Dann EINE klickbare Frage (AskUserQuestion).

---

## Modus B: Abgleich („Was gibt's von Telli?“, „Telli-Status“, „Was wartet von Telli auf mich?“)

1. `clickup_filter_tasks` mit `space_ids: ["1500400000000166"]`, ohne geschlossene; alle Seiten holen (`has_more`).
2. Zusätzlich erledigte der letzten 7 Tage: `include_closed: true`, `date_closed_from: <heute minus 7>`.
3. Letzten Kommentar holen (`clickup_get_task_comments`) für: alles in 💬 Für Shukri, alles in `in progress` und alle Aufgaben, die in den letzten 7 Tagen aktualisiert wurden. „Wartet auf Shukri“ = der letzte Kommentar ist von Telli (User-ID `105711117`) oder erwähnt @Shukri.
4. Ausgabe, höchstens 12 Zeilen:

```
👥 Team Telli, <Wochentag TT.MM.>
🟣 Wartet auf dich: <n>
   • [Titel](link): <Kern des letzten Kommentars, 1 Zeile>
🔴 Überfällig: <n> (<Titel>)
🔵 In Arbeit: <n> · ⚪ Offen: <n>
✅ Erledigt (7 Tage): <n>
💬 Neu von Telli: <Titel>
```

5. Für jede wartende Aufgabe eine klickbare Frage (AskUserQuestion, höchstens 4 pro Runde): „Passt, umsetzen“ (Empfehlung, wenn nichts dagegen spricht) · „Ändern“ (Wunsch per Freitext) · „Später“. Bei einer Frage von Telli: Antwort als Option(en), wenn sie sich aus dem Kontext ergibt, sonst Freitext.
6. Zurückschreiben: Kommentar mit Shukris Entscheidung, unterschrieben mit „(über Claude)“. Status nur ändern, wenn es aus Shukris Antwort folgt: `complete` bei „erledigt“ oder „passt so“ für ein fertiges Ergebnis, `in progress` bei „mach weiter“. Kommentare laufen über Shukris Konto, Telli bekommt die Benachrichtigung.

---

## Modus C: Schnelle Entscheidung per Satz

„Das Laborzimmer ist gut so“ → passende Aufgabe suchen, `complete` + Kommentar „Passt so, danke! (über Claude)“.
„Beim Laborzimmer lieber eine Pflanze statt Paravent“ → Kommentar mit dem Wunsch, Status `in progress`.
Bei mehreren Treffern: EINE klickbare Frage, welche Aufgabe gemeint ist.

---

## Wiederkehrende Aufgaben („Telli soll jeden Montag …“)

Die API kann keine Wiederholung setzen. Aufgabe mit dem nächsten Termin anlegen und Shukri die zwei Klicks in der ClickUp-App nennen (Fälligkeitsdatum, Wiederholen).

## Output

- Aufgabe(n) im Space „Team Telli“, korrekt gelistet, datenschutzsauber, mit Link an Shukri
- Bei Abgleich: kompakte Übersicht + Entscheidungen zurückgeschrieben

## Stop

Wenn alle genannten Aufgaben angelegt bzw. alle Entscheidungen zurückgeschrieben sind.

## NICHT tun

- Keine vollen Patientennamen, Telefonnummern, Diagnosen, Befunde oder Medikamente mit Personenbezug in ClickUp (auch nicht in Kommentaren)
- Nichts außerhalb von ClickUp an Telli senden (keine Mails, keine Messenger), außer Shukri sagt es ausdrücklich
- Keine Aufgaben ungefragt löschen. `complete` nur setzen, wenn Shukri es sagt
- Telli-Aufgaben nicht im Space „Team Hamze“ anlegen und umgekehrt
- Kein „Dr.“, keine Gedankenstriche, keine Heilversprechen in Texten, die nach außen gehen

## Verwandt

Statusnotiz `_memory/project_team_telli_status.md` · Skill `team-hamze` · `_memory/project_praxis_operations.md` · Skill `lawyer-audit-universal`
Der Skill liegt zweimal und soll gleich bleiben: im Vault (`_skills/team-telli.md`, Google Drive „Meine Ablage/Claude“) für den Mac und im Repo shukri-next (`.claude/skills/team-telli/SKILL.md`) für Cloud-Sessions.
