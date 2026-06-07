// src/Components/SignaturePad.js
//
// Touch/mouse signature canvas for the iPad Honorar forms. Adapted from the
// original standalone-HTML initPad(). Exposes an imperative handle so the form
// can read the signature, check whether anything was drawn, and clear it.
//
//   const ref = useRef();
//   <SignaturePad ref={ref} />
//   ref.current.hasInk()  -> boolean
//   ref.current.toDataURL() -> PNG data URL ("" if empty)
//   ref.current.clear()

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SignaturePad = forwardRef(function SignaturePad({ height = 150 }, ref) {
  const canvasRef = useRef(null);
  const inkRef = useRef(false);
  const drawingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    hasInk: () => inkRef.current,
    toDataURL: () =>
      inkRef.current ? canvasRef.current.toDataURL("image/png") : "",
    clear: () => {
      const c = canvasRef.current;
      if (!c) return;
      c.getContext("2d").clearRect(0, 0, c.width, c.height);
      inkRef.current = false;
    },
  }));

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");

    function configureStroke() {
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1f24";
    }

    function resize() {
      const r = c.getBoundingClientRect();
      const dp = window.devicePixelRatio || 1;
      c.width = r.width * dp;
      c.height = r.height * dp;
      ctx.scale(dp, dp);
      configureStroke();
    }

    const resizeTimer = setTimeout(resize, 50);
    window.addEventListener("resize", resize);

    function pos(e) {
      const r = c.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function start(e) {
      drawingRef.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    }
    function move(e) {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      inkRef.current = true;
      e.preventDefault();
    }
    function end() {
      drawingRef.current = false;
    }

    c.addEventListener("mousedown", start);
    c.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    c.addEventListener("touchstart", start, { passive: false });
    c.addEventListener("touchmove", move, { passive: false });
    c.addEventListener("touchend", end);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mouseup", end);
      c.removeEventListener("mousedown", start);
      c.removeEventListener("mousemove", move);
      c.removeEventListener("touchstart", start);
      c.removeEventListener("touchmove", move);
      c.removeEventListener("touchend", end);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        background: "#fff",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.2)",
        touchAction: "none",
        display: "block",
      }}
    />
  );
});

export default SignaturePad;
