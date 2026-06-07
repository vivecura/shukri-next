"use client";

import { useEffect } from "react";

// Re-executes inline <script> bodies extracted from a blog/therapy HTML file
// (scopeBlogHtml returns them in the `scripts` array). Inline scripts injected
// via dangerouslySetInnerHTML do NOT run; React intentionally skips them, so we
// recreate <script> elements client-side after hydrate.
export default function BlogScripts({ scripts }) {
  useEffect(() => {
    if (!scripts || scripts.length === 0) return;
    const created = [];
    for (const code of scripts) {
      const el = document.createElement("script");
      el.textContent = code;
      document.body.appendChild(el);
      created.push(el);
    }
    return () => {
      for (const el of created) el.remove();
    };
  }, [scripts]);
  return null;
}
