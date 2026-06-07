# Request Indexing — Worklist

A prioritized checklist for nudging Google to crawl + index the ~50 URLs currently
sitting in **"Discovered – currently not indexed"** in Search Console.

---

## How to use

1. Open Google Search Console → click **URL Inspection** at the top.
2. Paste one URL from the list below into the search bar.
3. Wait ~5 seconds for the report to load.
4. Click **"Request Indexing"** (top right of the report).
5. Wait for the small "Indexing requested" confirmation, then close.
6. Tick the box `[ ]` → `[x]` here.
7. **Stop after ~10 requests per day.** Google rate-limits this and will grey
   out the button. The limit resets after ~24 hours.

Expect each URL to be crawled within hours to a few days. Indexing decision
follows shortly after — sometimes same day, sometimes weeks. "Crawled but not
indexed" is a separate category from "Discovered" and means Google looked but
chose not to index; if you start seeing that, the lever shifts to content
quality and authority (backlinks, GBP, reviews).

---

## Authoritative source

The actual 50 URLs in the "Discovered" bucket can be exported from GSC:

1. GSC → Indexing → Pages
2. Click into the row **"Discovered – currently not indexed"**
3. Top-right of the URL list → **Export → CSV / Google Sheets**

Cross-reference that export against the list below. URLs that aren't in the
export are either already indexed or in a different bucket — skip them.

---

## Tier 1 — Just-fixed redirect errors

These two were broken on May 3 (locale corruption bug, fixed in `f35ffa4`) and
have a Validate Fix re-crawl in flight. Manually requesting indexing in
parallel will speed it up.

- [x] https://vivecura.com/en
- [x ] https://vivecura.com/en/about

---

## Tier 2 — EN top-level service pages (highest commercial value)

The English-language entry points for the practice's premium services. These
are the pages international/expat patients in Berlin will land on from Google.

- [x ] https://vivecura.com/en/diagnostics
- [x ] https://vivecura.com/en/prevention-longevity
- [x ] https://vivecura.com/en/ketamine
- [ x] https://vivecura.com/en/special-therapies
- [ x] https://vivecura.com/en/psychotherapy
- [x ] https://vivecura.com/en/infusions
- [x ] https://vivecura.com/en/consultations
- [x ] https://vivecura.com/en/physical-symptoms

---

## Tier 3 — EN secondary pages

- [ x] https://vivecura.com/en/blog
- [ x] https://vivecura.com/en/mentoring
- [x ] https://vivecura.com/en/experience
- [ x] https://vivecura.com/en/my-book
- [ x] https://vivecura.com/en/legal-notice

---

## Tier 4 — EN cornerstone blog posts (AI-citation candidates)

These cover the topics the practice wants to be cited for in ChatGPT,
Perplexity, and Google AI Overviews. They have FAQ structure that LLMs quote
verbatim.

- [x ] https://vivecura.com/en/blog/ketamin-therapie
- [x ] https://vivecura.com/en/blog/nad-plus-infusion
- [x ] https://vivecura.com/en/blog/burnout
- [ x] https://vivecura.com/en/blog/cholesterin-mythos-wissenschaft
- [x ] https://vivecura.com/en/blog/schwermetalle

---

## Tier 5 — EN supporting blog posts

- [ x] https://vivecura.com/en/blog/intervallfasten-frauen-ab-40
- [x ] https://vivecura.com/en/blog/schlaf-und-schlafstoerungen-ganzheitlich
- [ x] https://vivecura.com/en/blog/anthroposophische-medizin-wer-heilt-hat-recht
- [ x] https://vivecura.com/en/blog/mounjaro-tirzepatid
- [ x] https://vivecura.com/en/blog/schimmel-schulmedizin
- [x ] https://vivecura.com/en/blog/darm-reset
- [x ] https://vivecura.com/en/blog/chronische-fatigue-me-cfs-individuell
- [x ] https://vivecura.com/en/blog/funktionelle-schilddruesenunterfunktion
- [x ] https://vivecura.com/en/blog/eisenmangel-und-eiseninfusionen
- [x ] https://vivecura.com/en/blog/testosteron-mangel
- [x ] https://vivecura.com/en/blog/oestrogen-dominanz
- [x ] https://vivecura.com/en/blog/heilpflanzen-infusion

---

## Tier 6 — DE top-level pages (skip any already indexed)

Cross-reference each one against GSC → Indexing → Pages → Indexed list before
requesting. The big-name DE pages (`/`, `/ueber-mich`, `/spezielle-therapien`)
are almost certainly already indexed — only request the ones that aren't.

- [x ] https://vivecura.com/koerperliche-symptome
- [ x] https://vivecura.com/infusions
- [x ] https://vivecura.com/experience
- [ x] https://vivecura.com/beratung
- [x ] https://vivecura.com/mentoring
- [x ] https://vivecura.com/mein-buch
- [ x] https://vivecura.com/diagnostik
- [x ] https://vivecura.com/praevention-longevity
- [x ] https://vivecura.com/psychotherapie
- [ x] https://vivecura.com/ketamin
- [x ] https://vivecura.com/spezielle-therapien
- [ x] https://vivecura.com/ueber-mich
- [x ] https://vivecura.com/blog
- [x ] https://vivecura.com/rechtliches

---

## Tier 7 — DE blog posts (skip any already indexed)

Same as above — only request URLs that aren't already in the GSC indexed list.

- [x ] https://vivecura.com/blog/ketamin-therapie
- [x ] https://vivecura.com/blog/nad-plus-infusion
- [ x] https://vivecura.com/blog/burnout
- [x ] https://vivecura.com/blog/cholesterin-mythos-wissenschaft
- [ x] https://vivecura.com/blog/schwermetalle
- [x ] https://vivecura.com/blog/intervallfasten-frauen-ab-40
- [x ] https://vivecura.com/blog/schlaf-und-schlafstoerungen-ganzheitlich
- [ x] https://vivecura.com/blog/anthroposophische-medizin-wer-heilt-hat-recht
- [ x] https://vivecura.com/blog/mounjaro-tirzepatid
- [x ] https://vivecura.com/blog/schimmel-schulmedizin
- [ x] https://vivecura.com/blog/darm-reset
- [x ] https://vivecura.com/blog/chronische-fatigue-me-cfs-individuell
- [x ] https://vivecura.com/blog/funktionelle-schilddruesenunterfunktion
- [ x] https://vivecura.com/blog/eisenmangel-und-eiseninfusionen
- [ x] https://vivecura.com/blog/testosteron-mangel
- [ x] https://vivecura.com/blog/oestrogen-dominanz
- [ ] https://vivecura.com/blog/heilpflanzen-infusion

---

## Suggested 5-day cadence

| Day | URLs | Tier |
|---|---|---|
| Day 1 | Tier 1 (2) + first 8 of Tier 2 | All EN money pages |
| Day 2 | Last of Tier 2 + Tier 3 (5) + first 4 of Tier 4 | EN secondary + cornerstone start |
| Day 3 | Last of Tier 4 + first 9 of Tier 5 | EN cornerstone + blog posts |
| Day 4 | Last 3 of Tier 5 + first 7 of Tier 6 | EN blog tail + DE top-level |
| Day 5 | Remainder of Tier 6 + Tier 7 (skip indexed) | DE cleanup |

If a URL is rejected with "URL is unknown to Google" or similar, leave the
checkbox unticked and note the error. That's a signal worth investigating
separately.

---

## What "success" looks like

Two weeks after working through this list, expect to see in GSC:

- **Indexed pages** counter rising from 14 toward 30+
- **"Discovered – currently not indexed"** dropping from 50 toward 10–20
- **"Page indexing"** report shows recent crawl dates on most listed URLs

If after 2 weeks an EN page is still in "Discovered", click into the URL
Inspection report for it — Google will usually explain why (low quality
signal, thin content, duplicate of another URL, etc.). At that point the lever
shifts from "request indexing" to "fix the underlying signal."
