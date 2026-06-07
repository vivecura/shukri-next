import { useEffect, useRef } from "react";

const SCOPE_CLASS = "blog-post-host";
const SCOPE_SELECTOR = "." + SCOPE_CLASS;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function splitTopLevel(input, sep) {
  const parts = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (c === sep && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.length) parts.push(buf);
  return parts;
}

function rewriteSelector(sel, scope) {
  const leading = sel.match(/^\s*/)[0];
  const trailing = sel.match(/\s*$/)[0];
  const core = sel.slice(leading.length, sel.length - trailing.length);
  if (!core) return sel;
  const m = core.match(/^(:root|html|body)\b([\s\S]*)$/);
  if (m) return leading + scope + (m[2] || "") + trailing;
  return leading + scope + " " + core + trailing;
}

function rewriteSelectorList(list, scope) {
  return splitTopLevel(list, ",").map((p) => rewriteSelector(p, scope)).join(",");
}

function rewriteBlock(css, scope) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (/\s/.test(c)) { out += c; i++; continue; }

    if (c === "@") {
      let j = i + 1;
      while (j < css.length && /[a-zA-Z0-9-]/.test(css[j])) j++;
      const name = css.slice(i + 1, j).toLowerCase();

      let k = j;
      let pdepth = 0;
      while (k < css.length) {
        const cc = css[k];
        if (cc === "(") pdepth++;
        else if (cc === ")") pdepth--;
        else if (pdepth === 0 && (cc === "{" || cc === ";")) break;
        k++;
      }
      if (k >= css.length) { out += css.slice(i); break; }
      if (css[k] === ";") { out += css.slice(i, k + 1); i = k + 1; continue; }

      const prelude = css.slice(i, k);
      let m = k + 1;
      let bd = 1;
      while (m < css.length && bd > 0) {
        if (css[m] === "{") bd++;
        else if (css[m] === "}") bd--;
        if (bd === 0) break;
        m++;
      }
      const body = css.slice(k + 1, m);
      const recurse = ["media", "supports", "container", "layer", "scope", "document"];
      const passthrough = ["keyframes", "-webkit-keyframes", "-moz-keyframes", "-o-keyframes", "font-face", "page", "property", "counter-style", "font-feature-values", "viewport", "charset", "namespace"];

      let newBody;
      if (recurse.includes(name)) newBody = rewriteBlock(body, scope);
      else if (passthrough.includes(name)) newBody = body;
      else newBody = body;

      out += prelude + "{" + newBody + "}";
      i = m + 1;
      continue;
    }

    let j = i;
    let pdepth = 0;
    while (j < css.length) {
      const cc = css[j];
      if (cc === "(" || cc === "[") pdepth++;
      else if (cc === ")" || cc === "]") pdepth--;
      else if (pdepth === 0 && cc === "{") break;
      else if (pdepth === 0 && cc === "}") break;
      j++;
    }
    if (j >= css.length) { out += css.slice(i); break; }
    if (css[j] === "}") { out += css.slice(i, j + 1); i = j + 1; continue; }

    const selector = css.slice(i, j);
    let m = j + 1;
    let bd = 1;
    while (m < css.length && bd > 0) {
      if (css[m] === "{") bd++;
      else if (css[m] === "}") bd--;
      if (bd === 0) break;
      m++;
    }
    const body = css.slice(j + 1, m);
    out += rewriteSelectorList(selector, scope) + "{" + body + "}";
    i = m + 1;
  }
  return out;
}

function scopeCss(cssText, scope) {
  if (!cssText) return "";
  return rewriteBlock(stripComments(cssText), scope);
}

function ShadowHtml({ html }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !html) return;

    while (host.firstChild) host.removeChild(host.firstChild);
    host.className = SCOPE_CLASS;
    host.removeAttribute("style");
    host.removeAttribute("id");

    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.head.querySelectorAll("style").forEach((styleNode) => {
      const scoped = scopeCss(styleNode.textContent || "", SCOPE_SELECTOR);
      const newStyle = document.createElement("style");
      Array.from(styleNode.attributes).forEach((attr) => newStyle.setAttribute(attr.name, attr.value));
      newStyle.textContent = scoped;
      host.appendChild(newStyle);
    });

    doc.head.querySelectorAll("link[rel='stylesheet'], link[rel='preconnect'], link[rel='dns-prefetch']").forEach((linkNode) => {
      const href = linkNode.getAttribute("href");
      if (!href) return;
      if (document.head.querySelector(`link[href="${CSS.escape ? CSS.escape(href) : href}"]`)) return;
      document.head.appendChild(linkNode.cloneNode(true));
    });

    if (doc.documentElement) {
      const cls = doc.documentElement.getAttribute("class");
      if (cls) cls.split(/\s+/).filter(Boolean).forEach((c) => host.classList.add(c));
    }
    if (doc.body) {
      const cls = doc.body.getAttribute("class");
      if (cls) cls.split(/\s+/).filter(Boolean).forEach((c) => host.classList.add(c));
      const id = doc.body.getAttribute("id");
      if (id) host.id = id;
    }

    const htmlStyle = doc.documentElement ? (doc.documentElement.getAttribute("style") || "") : "";
    const bodyStyle = doc.body ? (doc.body.getAttribute("style") || "") : "";
    const combined = [htmlStyle, bodyStyle].filter(Boolean).join(";");
    if (combined.trim()) host.setAttribute("style", combined);

    if (doc.body) {
      Array.from(doc.body.childNodes).forEach((node) => {
        host.appendChild(node.cloneNode(true));
      });
    }

    host.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }, [html]);

  return <div ref={hostRef} />;
}

export default ShadowHtml;
