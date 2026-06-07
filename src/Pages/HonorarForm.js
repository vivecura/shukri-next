// src/Pages/HonorarForm.js
//
// Single data-driven Honorarvereinbarung form rendered at /honorar/:slug.
// The patient enters name + birthdate, both parties sign, and on submit the
// agreement (incl. both signature PNGs) is saved to the patients Supabase
// project. Tablet-first; mirrors the original standalone-HTML forms.

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SignaturePad from "../Components/SignaturePad";
import { supabase } from "../supabaseClient";
import {
  BEHANDLER,
  PREAMBLE,
  PFLICHT,
  HINWEIS,
  getHonorarForm,
} from "../lib/honorarForms";

const C = {
  teal: "#43A9AB",
  tealSoft: "#5fc4c6",
  bg: "#0d1015",
  charcoal: "#1a1f24",
  cream: "#f4efe6",
  creamDim: "#a8a39a",
};

export default function HonorarForm() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const form = getHonorarForm(slug);

  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [ort, setOrt] = useState("Berlin");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState({ type: "idle", msg: "" });

  const sigPatient = useRef(null);
  const sigArzt = useRef(null);

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = C.bg;
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  if (!form) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, padding: 40, fontFamily: "system-ui" }}>
        <p>Unbekannte Leistung.</p>
        <Link to="/honorar" style={{ color: C.tealSoft }}>← Zurück zur Übersicht</Link>
      </div>
    );
  }

  async function handleSubmit() {
    if (!vorname.trim() || !nachname.trim() || !geburtsdatum) {
      setStatus({ type: "error", msg: "Bitte Vorname, Nachname und Geburtsdatum eintragen." });
      return;
    }
    if (!ort.trim() || !datum) {
      setStatus({ type: "error", msg: "Bitte Ort und Datum eintragen." });
      return;
    }
    if (!sigPatient.current.hasInk() || !sigArzt.current.hasInk()) {
      setStatus({ type: "error", msg: "Bitte beide Unterschriften." });
      return;
    }

    const datumDE = datum.split("-").reverse().join(".");
    const payload = {
      service_slug: form.slug,
      service_title: form.title,
      patient_name: `${nachname.trim()}, ${vorname.trim()}`,
      patient_geburtsdatum: geburtsdatum,
      ort_datum: `${ort.trim()}, ${datumDE}`,
      gesamt: form.gesamt,
      patient_signature: sigPatient.current.toDataURL(),
      arzt_signature: sigArzt.current.toDataURL(),
    };

    setStatus({ type: "saving", msg: "Wird gespeichert…" });
    const { error } = await supabase
      .from("honorar_submissions")
      .insert(payload);

    if (error) {
      setStatus({ type: "error", msg: "Speichern fehlgeschlagen: " + error.message });
      return;
    }
    setStatus({ type: "ok", msg: "Vereinbarung gespeichert. Danke!" });
  }

  const labelStyle = { fontSize: 12, color: C.creamDim, display: "block", marginBottom: 5 };
  const inputStyle = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    background: "#0d1015",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 10,
    color: C.cream,
    padding: "11px 12px",
    fontSize: 15,
    fontFamily: "inherit",
  };

  if (status.type === "ok") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.teal, color: C.bg, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>✓</div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>{status.msg}</h1>
          <p style={{ color: C.creamDim, marginBottom: 24 }}>{form.title}</p>
          <button onClick={() => navigate("/honorar")} style={{ background: C.teal, color: C.bg, border: "none", borderRadius: 12, padding: "13px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", lineHeight: 1.6, padding: 28 }}>
      <style>{`
        .hon-pf{ display:flex; flex-direction:column; gap:14px; margin:12px 0; }
        .hon-pf input{ width:100%; min-width:0; box-sizing:border-box; display:block; }
        .hon-sigs{ display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:22px; }
        @media (max-width:560px){ .hon-sigs{ grid-template-columns:1fr; } .hon-pf{ grid-template-columns:1fr; } }
        .hon-tbl{ width:100%; border-collapse:collapse; margin:12px 0; font-size:14px; }
        .hon-tbl th,.hon-tbl td{ text-align:left; padding:9px 10px; border-bottom:1px solid rgba(255,255,255,.1); }
        .hon-tbl th{ color:${C.tealSoft}; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
        .hon-tbl td.num,.hon-tbl th.num{ text-align:right; }
      `}</style>

      <div style={{ maxWidth: 780, margin: "0 auto", background: C.charcoal, borderRadius: 18, padding: 32, border: "1px solid rgba(255,255,255,.08)" }}>
        <Link to="/honorar" style={{ color: C.tealSoft, fontSize: 13, textDecoration: "none" }}>← Übersicht</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 6px" }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.teal, color: C.bg, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>V</span>
          <span style={{ letterSpacing: ".18em", fontWeight: 700 }}>VIVECURA</span>
        </div>
        <div style={{ color: C.creamDim, fontSize: 13, marginBottom: 18 }}>
          Shukri Jarmoukli · ViveCura, Skalitzer Straße 137, 10999 Berlin
        </div>

        <h1 style={{ fontSize: 21, margin: "12px 0 2px" }}>{form.title}</h1>
        <div style={{ color: C.creamDim, fontSize: 12.5, marginBottom: 16 }}>{form.gesetz}</div>

        <div style={{ fontSize: 13.5, margin: "12px 0", padding: "12px 14px", background: "rgba(255,255,255,.03)", borderRadius: 10 }}>
          <div style={{ margin: "3px 0" }}><strong>Behandler:</strong> {BEHANDLER}</div>
          <div style={{ margin: "3px 0" }}><strong>Patient/in:</strong></div>
        </div>

        <div className="hon-pf">
          <div>
            <label style={labelStyle}>Vorname</label>
            <input style={inputStyle} type="text" autoComplete="given-name" value={vorname} onChange={(e) => setVorname(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Nachname</label>
            <input style={inputStyle} type="text" autoComplete="family-name" value={nachname} onChange={(e) => setNachname(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Geburtsdatum</label>
            <input style={inputStyle} type="date" value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Ort</label>
            <input style={inputStyle} type="text" value={ort} onChange={(e) => setOrt(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Datum</label>
            <input style={inputStyle} type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: 13.5, margin: "12px 0" }}>{PREAMBLE}</p>

        <table className="hon-tbl">
          <thead>
            <tr>
              <th>GOÄ-Nr.</th>
              <th>Leistung</th>
              <th className="num">Faktor</th>
              <th className="num">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {form.rows.map((r, i) => (
              <tr key={i}>
                <td>{r.nr}</td>
                <td>{r.leistung}</td>
                <td className="num">{r.faktor}</td>
                <td className="num">{r.betrag}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 18, fontWeight: 800, margin: "10px 0", textAlign: "right" }}>{form.gesamt}</div>

        {form.skNotes.map((n, i) => (
          <p key={i} style={{ fontSize: 13, color: C.creamDim, margin: "8px 0" }}>{n}</p>
        ))}

        <p style={{ background: "rgba(67,169,171,.1)", borderLeft: `3px solid ${C.teal}`, padding: "12px 14px", borderRadius: 8, fontSize: 13, margin: "14px 0" }}>{PFLICHT}</p>
        <p style={{ fontSize: 12.5, color: C.creamDim, margin: "10px 0" }}>{HINWEIS}</p>

        <div className="hon-sigs">
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
              Unterschrift Patient/in (bzw. Sorgeberechtigte/r)
            </label>
            <SignaturePad ref={sigPatient} />
            <button type="button" onClick={() => sigPatient.current.clear()} style={{ marginTop: 6, background: "none", border: "1px solid rgba(255,255,255,.2)", color: C.creamDim, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
              Löschen
            </button>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
              Unterschrift Shukri Jarmoukli
            </label>
            <SignaturePad ref={sigArzt} />
            <button type="button" onClick={() => sigArzt.current.clear()} style={{ marginTop: 6, background: "none", border: "1px solid rgba(255,255,255,.2)", color: C.creamDim, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
              Löschen
            </button>
          </div>
        </div>

        {status.type === "error" && (
          <p style={{ color: "#ff8a8a", fontSize: 13.5, marginTop: 16 }}>{status.msg}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={status.type === "saving"}
          style={{ marginTop: 22, width: "100%", background: C.teal, color: C.bg, border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 700, cursor: status.type === "saving" ? "default" : "pointer", opacity: status.type === "saving" ? 0.7 : 1 }}
        >
          {status.type === "saving" ? "Wird gespeichert…" : "Vereinbarung bestätigen"}
        </button>

        <div style={{ marginTop: 20, fontSize: 12, color: C.creamDim, textAlign: "center" }}>
          ViveCura · vivecura.com · praxis@vivecura.com
        </div>
      </div>
    </div>
  );
}
