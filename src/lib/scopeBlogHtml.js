import { parse } from "node-html-parser";

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
      const newBody = recurse.includes(name) ? rewriteBlock(body, scope) : body;

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

// Server-side port of src/Components/ShadowHtml.js. Given a full HTML document
// from blog_posts.html_content, returns the ingredients for rendering the post
// inside a .blog-post-host wrapper with scoped CSS (zero leakage to site chrome).
//
// Returns:
//   - styles[]: scoped <style> bodies (CSS strings) to render as <style> blocks
//   - bodyHtml: <body> inner HTML, ready for dangerouslySetInnerHTML
//   - scripts[]: inline <script> bodies (re-executed client-side after hydrate)
//   - links[]: stylesheet/preconnect/dns-prefetch attribute maps for the head
//   - hostClasses[]: extra classes from <html>/<body> to add to the host
//   - hostId: optional id from <body>
//   - hostStyle: combined inline style from <html> + <body>, or null
export function scopeBlogHtml(html) {
  const empty = {
    styles: [],
    bodyHtml: "",
    scripts: [],
    links: [],
    hostClasses: [],
    hostId: null,
    hostStyle: null,
  };
  if (!html) return empty;

  const doc = parse(html, { lowerCaseTagName: false, comment: false });

  const styles = [];
  doc.querySelectorAll("style").forEach((node) => {
    const text = node.text || "";
    styles.push(scopeCss(text, SCOPE_SELECTOR));
  });

  const links = [];
  doc.querySelectorAll("link").forEach((node) => {
    const rel = (node.getAttribute("rel") || "").toLowerCase();
    if (rel !== "stylesheet" && rel !== "preconnect" && rel !== "dns-prefetch") return;
    const href = node.getAttribute("href");
    if (!href) return;
    const attrs = {};
    for (const [k, v] of Object.entries(node.attributes || {})) {
      attrs[k] = v;
    }
    links.push(attrs);
  });

  const htmlEl = doc.querySelector("html");
  const bodyEl = doc.querySelector("body");

  const scripts = [];
  doc.querySelectorAll("script").forEach((node) => {
    const text = node.text || "";
    if (text) scripts.push(text);
  });

  const hostClasses = [];
  if (htmlEl) {
    const cls = htmlEl.getAttribute("class");
    if (cls) cls.split(/\s+/).filter(Boolean).forEach((c) => hostClasses.push(c));
  }
  if (bodyEl) {
    const cls = bodyEl.getAttribute("class");
    if (cls) cls.split(/\s+/).filter(Boolean).forEach((c) => hostClasses.push(c));
  }

  const htmlStyle = (htmlEl && htmlEl.getAttribute("style")) || "";
  const bodyStyle = (bodyEl && bodyEl.getAttribute("style")) || "";
  const combinedStyle = [htmlStyle, bodyStyle].filter(Boolean).join(";").trim();

  const hostId = (bodyEl && bodyEl.getAttribute("id")) || null;

  let bodyHtml = "";
  if (bodyEl) {
    bodyEl.querySelectorAll("script").forEach((s) => s.remove());
    bodyEl.querySelectorAll("style").forEach((s) => s.remove());
    bodyHtml = bodyEl.innerHTML;
  } else {
    doc.querySelectorAll("script, style, link").forEach((n) => n.remove());
    bodyHtml = doc.innerHTML;
  }

  return {
    styles,
    bodyHtml,
    scripts,
    links,
    hostClasses,
    hostId,
    hostStyle: combinedStyle || null,
  };
}

export { SCOPE_CLASS, SCOPE_SELECTOR };
