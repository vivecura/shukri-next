import { useState } from "react";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";
import { supabase } from "../supabaseClient";
import Seo from "../Components/Seo";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const TIME_KEYS = ["morning", "afternoon", "late_afternoon"];
const DAUER_KEYS = [0, 1, 2, 3];
const ANLIEGEN_COUNT = 4;
const TOTAL_STEPS = 4;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-/()]{5,}$/;

export default function Kontakt() {
  const { t } = useTranslation();
  const lang = useLanguage();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState({
    anliegen: [],
    situation: "",
    dauer: "",
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    versicherung: "",
    preferredDays: [],
    preferredTimes: [],
    dsgvo: false,
  });
  const [errors, setErrors] = useState({});

  const setField = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggleInArray = (key, value) => {
    setData((d) => {
      const has = d[key].includes(value);
      return { ...d, [key]: has ? d[key].filter((x) => x !== value) : [...d[key], value] };
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const anliegenLabels = t("kontakt.step2.options", { returnObjects: true });
  const dauerLabels = t("kontakt.step3.dauerOptions", { returnObjects: true });

  const validateStep = (s) => {
    const e = {};
    if (s === 2 && data.anliegen.length === 0) {
      e.anliegen = t("kontakt.step2.error");
    }
    if (s === 3 && !data.dauer) {
      e.dauer = t("kontakt.step3.dauerError");
    }
    if (s === 4) {
      if (!data.vorname || data.vorname.trim().length < 2) e.vorname = t("kontakt.step4.errors.vorname");
      if (!data.nachname || data.nachname.trim().length < 2) e.nachname = t("kontakt.step4.errors.nachname");
      if (!EMAIL_RE.test(data.email)) e.email = t("kontakt.step4.errors.email");
      if (!PHONE_RE.test(data.telefon)) e.telefon = t("kontakt.step4.errors.telefon");
      if (!data.versicherung) e.versicherung = t("kontakt.step4.errors.versicherung");
      if (data.preferredDays.length === 0) e.preferredDays = t("kontakt.step4.errors.preferredDays");
      if (data.preferredTimes.length === 0) e.preferredTimes = t("kontakt.step4.errors.preferredTimes");
      if (!data.dsgvo) e.dsgvo = t("kontakt.step4.errors.dsgvo");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1) return setStep(2);
    if (validateStep(step)) setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    setSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    const { error } = await supabase.from("contact_requests").insert({
      language: lang,
      anliegen: data.anliegen,
      situation: data.situation || null,
      dauer: data.dauer || null,
      vorname: data.vorname.trim(),
      nachname: data.nachname.trim(),
      email: data.email.trim(),
      telefon: data.telefon.trim(),
      versicherung: data.versicherung,
      preferred_days: data.preferredDays,
      preferred_times: data.preferredTimes,
      dsgvo_consent_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (error) {
      console.error("[Kontakt] submit error:", error);
      setErrors((prev) => ({ ...prev, submit: t("kontakt.step4.errors.submit") }));
      return;
    }
    setDone(true);
  };

  const Card = ({ value, selected, onClick, children }) => (
    <button
      type="button"
      className={`vc-card ${selected ? "is-selected" : ""}`}
      onClick={() => onClick(value)}
      aria-pressed={selected}
    >
      <span className="vc-card__indicator" aria-hidden>{selected ? "✓" : ""}</span>
      <span className="vc-card__label">{children}</span>
    </button>
  );

  const Chip = ({ value, selected, onClick, children }) => (
    <button
      type="button"
      className={`vc-chip ${selected ? "is-selected" : ""}`}
      onClick={() => onClick(value)}
      aria-pressed={selected}
    >
      {children ?? value}
    </button>
  );

  const Err = ({ id }) =>
    errors[id] ? (
      <p className="vc-error" role="alert">{errors[id]}</p>
    ) : null;

  if (done) {
    return (
      <>
        <Seo
          title={t("kontakt.seoTitle")}
          description={t("kontakt.seoDescription")}
        />
        <main className="bg-[#f5f3ed] min-h-screen pt-20 pb-12 px-4 vc-form-host">
          <div className="vc-form-card mx-auto">
            <div className="vc-form">
              <div className="vc-success">
                <div className="vc-success__check">✓</div>
                <h2>{t("kontakt.successHeading", { name: data.vorname })}</h2>
                <p>{t("kontakt.successBody")}</p>
              </div>
            </div>
          </div>
        </main>
        <KontaktStyles />
      </>
    );
  }

  return (
    <>
      <Seo title={t("kontakt.seoTitle")} description={t("kontakt.seoDescription")} />
      <main className="bg-[#f5f3ed] min-h-screen pt-20 pb-12 px-4 vc-form-host">
        <div className="vc-form-card mx-auto">
          <form className="vc-form" onSubmit={handleSubmit} noValidate>
            <div className="vc-progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step}>
              <div className="vc-progress__fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
              <span className="vc-progress__label">
                {t("kontakt.progressLabel", { current: step, total: TOTAL_STEPS })}
              </span>
            </div>

            {step === 1 && (
              <section className="vc-step vc-welcome">
                <h2 className="vc-step__title">{t("kontakt.step1.title")}</h2>
                <p className="vc-welcome__lead">{t("kontakt.step1.lead")}</p>
              </section>
            )}

            {step === 2 && (
              <fieldset className="vc-step">
                <h2 className="vc-step__title">{t("kontakt.step2.title")}</h2>
                <p className="vc-step__hint">{t("kontakt.step2.hint")}</p>
                <div className="vc-cards">
                  {Array.from({ length: ANLIEGEN_COUNT }).map((_, i) => {
                    const label = Array.isArray(anliegenLabels) ? anliegenLabels[i] : "";
                    return (
                      <Card
                        key={i}
                        value={label}
                        selected={data.anliegen.includes(label)}
                        onClick={(v) => toggleInArray("anliegen", v)}
                      >
                        {label}
                      </Card>
                    );
                  })}
                </div>
                <Err id="anliegen" />
              </fieldset>
            )}

            {step === 3 && (
              <fieldset className="vc-step">
                <h2 className="vc-step__title">{t("kontakt.step3.title")}</h2>
                <p className="vc-step__hint">{t("kontakt.step3.hint")}</p>
                <label className="vc-label" htmlFor="situation">
                  {t("kontakt.step3.situationLabel")}{" "}
                  <span className="vc-optional">{t("kontakt.optional")}</span>
                </label>
                <textarea
                  id="situation"
                  className="vc-textarea"
                  rows={5}
                  maxLength={1000}
                  placeholder={t("kontakt.step3.situationPlaceholder")}
                  value={data.situation}
                  onChange={(e) => setField("situation", e.target.value)}
                />
                <div className="vc-counter">
                  {t("kontakt.step3.counter", { count: data.situation.length })}
                </div>

                <div className="vc-subgroup">
                  <p className="vc-label">{t("kontakt.step3.dauerLabel")}</p>
                  <div className="vc-chips">
                    {DAUER_KEYS.map((i) => {
                      const label = Array.isArray(dauerLabels) ? dauerLabels[i] : "";
                      return (
                        <Chip
                          key={i}
                          value={label}
                          selected={data.dauer === label}
                          onClick={(v) => setField("dauer", v)}
                        />
                      );
                    })}
                  </div>
                  <Err id="dauer" />
                </div>
              </fieldset>
            )}

            {step === 4 && (
              <fieldset className="vc-step">
                <h2 className="vc-step__title">{t("kontakt.step4.title")}</h2>
                <p className="vc-step__hint">{t("kontakt.step4.hint")}</p>

                <div className="vc-grid">
                  <div>
                    <label className="vc-label" htmlFor="vorname">
                      {t("kontakt.step4.vorname")} {t("kontakt.required")}
                    </label>
                    <input
                      id="vorname"
                      type="text"
                      className="vc-input"
                      value={data.vorname}
                      onChange={(e) => setField("vorname", e.target.value)}
                      autoComplete="given-name"
                    />
                    <Err id="vorname" />
                  </div>
                  <div>
                    <label className="vc-label" htmlFor="nachname">
                      {t("kontakt.step4.nachname")} {t("kontakt.required")}
                    </label>
                    <input
                      id="nachname"
                      type="text"
                      className="vc-input"
                      value={data.nachname}
                      onChange={(e) => setField("nachname", e.target.value)}
                      autoComplete="family-name"
                    />
                    <Err id="nachname" />
                  </div>
                  <div className="vc-grid__full">
                    <label className="vc-label" htmlFor="email">
                      {t("kontakt.step4.email")} {t("kontakt.required")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="vc-input"
                      value={data.email}
                      onChange={(e) => setField("email", e.target.value)}
                      autoComplete="email"
                    />
                    <Err id="email" />
                  </div>
                  <div className="vc-grid__full">
                    <label className="vc-label" htmlFor="telefon">
                      {t("kontakt.step4.telefon")} {t("kontakt.required")}
                    </label>
                    <input
                      id="telefon"
                      type="tel"
                      className="vc-input"
                      value={data.telefon}
                      onChange={(e) => setField("telefon", e.target.value)}
                      autoComplete="tel"
                      placeholder={t("kontakt.step4.telefonPlaceholder")}
                    />
                    <Err id="telefon" />
                  </div>
                </div>

                <div className="vc-subgroup">
                  <p className="vc-label">
                    {t("kontakt.step4.versicherungLabel")} {t("kontakt.required")}
                  </p>
                  <div className="vc-chips">
                    <Chip
                      value="privat"
                      selected={data.versicherung === "privat"}
                      onClick={(v) => setField("versicherung", v)}
                    >
                      {t("kontakt.step4.versicherung.privat")}
                    </Chip>
                    <Chip
                      value="selbstzahler"
                      selected={data.versicherung === "selbstzahler"}
                      onClick={(v) => setField("versicherung", v)}
                    >
                      {t("kontakt.step4.versicherung.selbstzahler")}
                    </Chip>
                  </div>
                  <p className="vc-note">{t("kontakt.step4.versicherungNote")}</p>
                  <Err id="versicherung" />
                </div>

                <div className="vc-subgroup">
                  <p className="vc-label">
                    {t("kontakt.step4.daysLabel")} {t("kontakt.required")}
                  </p>
                  <div className="vc-chips">
                    {DAY_KEYS.map((d) => (
                      <Chip
                        key={d}
                        value={d}
                        selected={data.preferredDays.includes(d)}
                        onClick={(v) => toggleInArray("preferredDays", v)}
                      >
                        {t(`kontakt.step4.days.${d}`)}
                      </Chip>
                    ))}
                  </div>
                  <Err id="preferredDays" />
                </div>

                <div className="vc-subgroup">
                  <p className="vc-label">
                    {t("kontakt.step4.timesLabel")} {t("kontakt.required")}
                  </p>
                  <div className="vc-chips">
                    {TIME_KEYS.map((tk) => (
                      <Chip
                        key={tk}
                        value={tk}
                        selected={data.preferredTimes.includes(tk)}
                        onClick={(v) => toggleInArray("preferredTimes", v)}
                      >
                        {t(`kontakt.step4.times.${tk}`)}
                      </Chip>
                    ))}
                  </div>
                  <Err id="preferredTimes" />
                </div>

                <label className="vc-checkbox">
                  <input
                    type="checkbox"
                    checked={data.dsgvo}
                    onChange={(e) => setField("dsgvo", e.target.checked)}
                  />
                  <span>
                    {t("kontakt.step4.dsgvo")}{" "}
                    <a
                      href={lang === "en" ? "/en/legal-notice" : "/rechtliches"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("kontakt.step4.dsgvoLink")}
                    </a>.
                  </span>
                </label>
                <Err id="dsgvo" />
                <Err id="submit" />
              </fieldset>
            )}

            <div className="vc-actions">
              {step > 1 && (
                <button
                  type="button"
                  className="vc-btn vc-btn--ghost"
                  onClick={prev}
                  disabled={submitting}
                >
                  {t("kontakt.back")}
                </button>
              )}
              {step === 1 && (
                <button type="button" className="vc-btn vc-btn--primary" onClick={next}>
                  {t("kontakt.start")}
                </button>
              )}
              {step > 1 && step < TOTAL_STEPS && (
                <button type="button" className="vc-btn vc-btn--primary" onClick={next}>
                  {t("kontakt.next")}
                </button>
              )}
              {step === TOTAL_STEPS && (
                <button type="submit" className="vc-btn vc-btn--primary" disabled={submitting}>
                  {submitting ? t("kontakt.submitting") : t("kontakt.submit")}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
      <KontaktStyles />
    </>
  );
}

function KontaktStyles() {
  return (
    <style>{`
      .vc-form-host { background: #f5f3ed; }
      .vc-form-card {
        max-width: 720px;
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(31,45,46,0.06);
        overflow: hidden;
      }
      .vc-form {
        --vc-primary: #43a9ab;
        --vc-primary-dark: #358a8c;
        --vc-primary-tint: #ecf6f6;
        --vc-card-bg: #fbfaf6;
        --vc-text: #1f2d2e;
        --vc-text-muted: #6b7878;
        --vc-border: #e3e7e6;
        --vc-error: #c14a3a;
        --vc-radius: 12px;
        max-width: 640px;
        margin: 0 auto;
        padding: 32px 24px 40px;
        color: var(--vc-text);
        font-size: 16px;
        line-height: 1.5;
      }
      .vc-progress {
        position: relative;
        height: 4px;
        background: var(--vc-border);
        border-radius: 999px;
        margin-bottom: 32px;
      }
      .vc-progress__fill {
        height: 100%;
        background: var(--vc-primary);
        border-radius: 999px;
        transition: width 0.3s ease;
      }
      .vc-progress__label {
        position: absolute; right: 0; top: 10px;
        font-size: 12px; color: var(--vc-text-muted);
      }
      .vc-step { border: none; padding: 0; margin: 0 0 8px; }
      .vc-step__title {
        font-size: 26px; line-height: 1.25; margin: 0 0 6px;
        font-weight: 600; letter-spacing: -0.01em;
      }
      .vc-step__hint {
        font-size: 15px; color: var(--vc-text-muted); margin: 0 0 24px;
      }
      .vc-welcome { text-align: left; padding: 8px 0 16px; }
      .vc-welcome__lead { font-size: 16px; line-height: 1.6; margin: 0; }
      .vc-cards { display: grid; grid-template-columns: 1fr; gap: 10px; }
      .vc-card {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; text-align: left;
        background: var(--vc-card-bg);
        border: 1.5px solid var(--vc-border);
        border-radius: var(--vc-radius);
        cursor: pointer; font-size: 15px; color: var(--vc-text);
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit; width: 100%;
      }
      .vc-card:hover { border-color: var(--vc-primary); }
      .vc-card.is-selected { border-color: var(--vc-primary); background: var(--vc-primary-tint); }
      .vc-card__indicator {
        flex: 0 0 22px; width: 22px; height: 22px;
        border-radius: 6px; border: 1.5px solid var(--vc-border); background: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 14px; color: #fff; transition: all 0.15s;
      }
      .vc-card.is-selected .vc-card__indicator { background: var(--vc-primary); border-color: var(--vc-primary); }
      .vc-card__label { flex: 1; }
      .vc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .vc-chip {
        padding: 8px 14px; border: 1.5px solid var(--vc-border);
        background: #fff; border-radius: 999px; font-size: 14px;
        color: var(--vc-text); cursor: pointer; transition: all 0.15s;
        font-family: inherit;
      }
      .vc-chip:hover { border-color: var(--vc-primary); }
      .vc-chip.is-selected { background: var(--vc-primary); border-color: var(--vc-primary); color: #fff; }
      .vc-label { display: block; font-weight: 600; margin: 0 0 6px; font-size: 14px; }
      .vc-optional { font-weight: 400; color: var(--vc-text-muted); font-size: 13px; margin-left: 4px; }
      .vc-input, .vc-textarea {
        width: 100%; border: 1.5px solid var(--vc-border);
        border-radius: var(--vc-radius); padding: 12px 14px; font-size: 16px;
        font-family: inherit; background: #fff; color: var(--vc-text);
        transition: border-color 0.15s; box-sizing: border-box;
      }
      .vc-input:focus, .vc-textarea:focus {
        outline: 2px solid var(--vc-primary); outline-offset: 1px; border-color: var(--vc-primary);
      }
      .vc-textarea { resize: vertical; min-height: 100px; }
      .vc-counter { text-align: right; font-size: 12px; color: var(--vc-text-muted); margin-top: 4px; }
      .vc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .vc-grid__full { grid-column: 1 / -1; }
      .vc-subgroup { margin-top: 22px; }
      .vc-checkbox {
        display: flex; gap: 10px; align-items: flex-start; margin-top: 20px;
        font-size: 13px; color: var(--vc-text-muted); line-height: 1.5; cursor: pointer;
      }
      .vc-checkbox input { margin-top: 3px; flex: 0 0 auto; width: 18px; height: 18px; accent-color: var(--vc-primary); }
      .vc-checkbox a { color: var(--vc-primary); text-decoration: underline; }
      .vc-note { margin: 8px 0 0; font-size: 12px; color: var(--vc-text-muted); line-height: 1.5; }
      .vc-error { color: var(--vc-error); font-size: 13px; margin-top: 6px; }
      .vc-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 28px; flex-wrap: wrap; }
      .vc-btn {
        padding: 12px 20px; border-radius: 999px; font-size: 15px; font-weight: 600;
        cursor: pointer; border: 1.5px solid transparent; transition: all 0.15s;
        font-family: inherit;
      }
      .vc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .vc-btn--primary { background: var(--vc-primary); color: #fff; margin-left: auto; }
      .vc-btn--primary:hover:not(:disabled) { background: var(--vc-primary-dark); }
      .vc-btn--ghost { background: transparent; color: var(--vc-text); border-color: var(--vc-border); }
      .vc-btn--ghost:hover:not(:disabled) { border-color: var(--vc-primary); color: var(--vc-primary); }
      .vc-success { text-align: center; padding: 40px 20px; }
      .vc-success h2 { font-size: 24px; margin: 0 0 12px; }
      .vc-success p { color: var(--vc-text-muted); margin: 8px 0; }
      .vc-success__check {
        width: 56px; height: 56px; border-radius: 50%; background: var(--vc-primary-tint);
        color: var(--vc-primary); display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px; font-size: 28px; font-weight: 700;
      }
      @media (max-width: 600px) {
        .vc-form { padding: 20px 16px 32px; max-width: 100%; }
        .vc-step__title { font-size: 22px; }
        .vc-step__hint { font-size: 14px; margin-bottom: 20px; }
        .vc-card { padding: 13px 14px; font-size: 15px; }
        .vc-card__indicator { flex: 0 0 20px; width: 20px; height: 20px; }
        .vc-grid { grid-template-columns: 1fr; gap: 12px; }
        .vc-actions { flex-direction: column-reverse; margin-top: 24px; }
        .vc-btn--primary, .vc-btn--ghost { width: 100%; margin-left: 0; padding: 14px 18px; }
      }
      @media (min-width: 601px) {
        .vc-form { padding: 40px 32px 48px; }
      }
      .vc-card:focus-visible, .vc-chip:focus-visible, .vc-btn:focus-visible {
        outline: 2px solid var(--vc-primary); outline-offset: 2px;
      }
    `}</style>
  );
}
