import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(600);
  const iframeRef = useRef(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin");
        return;
      }
      setSession(session);
    });
  }, [navigate]);

  // Fetch post
  useEffect(() => {
    if (!session) return;
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        navigate("/admin");
        return;
      }
      setPost(data);
      setLoading(false);
    };
    fetchPost();
  }, [id, session, navigate]);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || !e.data.type) return;

      if (e.data.type === "vivecura-blog-resize") {
        setIframeHeight(e.data.height + 20);
      }

      if (e.data.type === "vivecura-editor-dirty") {
        setHasChanges(true);
        setSaved(false);
      }

      if (e.data.type === "vivecura-editor-html-result") {
        saveHtml(e.data.html);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [post]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Toggle editing in iframe
  const toggleEditMode = useCallback(() => {
    const newMode = !editMode;
    setEditMode(newMode);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "vivecura-editor-toggle", enabled: newMode },
        "*"
      );
    }
  }, [editMode]);

  // Request HTML from iframe
  const requestSave = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "vivecura-editor-get-html" },
        "*"
      );
    }
  };

  // Save HTML to Supabase
  const saveHtml = async (html) => {
    if (!post) return;
    setSaving(true);

    const { error } = await supabase
      .from("blog_posts")
      .update({
        html_content: html,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    setSaving(false);

    if (!error) {
      setHasChanges(false);
      setSaved(true);
      setPost({ ...post, html_content: html });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  // Build iframe content with editor script
  const getEditorIframeContent = (htmlContent) => {
    const editorScript = `<script data-vc-injected>
(function() {
  /* ── Resize logic ── */
  function sendHeight() {
    var elems = document.body.getElementsByTagName('*');
    var maxBottom = 0;
    for (var i = 0; i < elems.length; i++) {
      var rect = elems[i].getBoundingClientRect();
      var bottom = rect.top + rect.height;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    var h = Math.ceil(Math.max(maxBottom, document.body.scrollHeight));
    window.parent.postMessage({ type: 'vivecura-blog-resize', height: h }, '*');
  }
  window.addEventListener('load', function() {
    setTimeout(sendHeight, 200);
    setTimeout(sendHeight, 1000);
  });
  window.addEventListener('resize', function() { setTimeout(sendHeight, 100); });

  /* ── Editor logic ── */
  var BLOCK_TAGS = ['H1','H2','H3','H4','H5','H6','P','LI','BLOCKQUOTE','TD','TH','FIGCAPTION'];
  var INLINE_TAGS = ['SPAN','A','LABEL'];
  var ALL_TAGS = BLOCK_TAGS.concat(INLINE_TAGS);
  var elements = [];
  var editMode = false;

  function collectElements() {
    elements = [];
    var all = document.querySelectorAll(ALL_TAGS.join(','));
    var editableParents = new Set();

    all.forEach(function(el) {
      if (!el.textContent.trim()) return;
      // Skip inline elements if their parent is already editable
      if (INLINE_TAGS.indexOf(el.tagName) !== -1) {
        var parent = el.parentElement;
        while (parent) {
          if (BLOCK_TAGS.indexOf(parent.tagName) !== -1) return; // parent block will be editable
          parent = parent.parentElement;
        }
      }
      elements.push(el);
    });
  }

  function hoverIn() {
    if (document.activeElement !== this) {
      this.style.outline = '2px dashed rgba(67,169,171,0.4)';
      this.style.outlineOffset = '2px';
    }
  }
  function hoverOut() {
    if (document.activeElement !== this) {
      this.style.outline = '';
      this.style.outlineOffset = '';
    }
  }
  function focusIn() {
    this.style.outline = '2px solid rgba(67,169,171,0.8)';
    this.style.outlineOffset = '2px';
  }
  function focusOut() {
    this.style.outline = '';
    this.style.outlineOffset = '';
  }
  function onInput() {
    window.parent.postMessage({ type: 'vivecura-editor-dirty' }, '*');
  }
  function preventLinks(e) {
    if (e.target.closest('a')) e.preventDefault();
  }

  function enableEditing() {
    collectElements();
    elements.forEach(function(el) {
      el.contentEditable = 'true';
      el.setAttribute('data-vc-editor', '1');
      el.style.cursor = 'text';
      el.addEventListener('mouseenter', hoverIn);
      el.addEventListener('mouseleave', hoverOut);
      el.addEventListener('focus', focusIn);
      el.addEventListener('blur', focusOut);
      el.addEventListener('input', onInput);
    });
    document.addEventListener('click', preventLinks, true);
    editMode = true;
    setTimeout(sendHeight, 100);
  }

  function disableEditing() {
    elements.forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-vc-editor');
      el.style.cursor = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.removeEventListener('mouseenter', hoverIn);
      el.removeEventListener('mouseleave', hoverOut);
      el.removeEventListener('focus', focusIn);
      el.removeEventListener('blur', focusOut);
      el.removeEventListener('input', onInput);
    });
    document.removeEventListener('click', preventLinks, true);
    editMode = false;
  }

  function extractHtml() {
    var wasEditing = editMode;
    if (wasEditing) disableEditing();

    // Remove injected scripts temporarily
    var scripts = document.querySelectorAll('script[data-vc-injected]');
    var saved = [];
    scripts.forEach(function(s) {
      saved.push({ parent: s.parentNode, next: s.nextSibling, el: s });
      s.remove();
    });

    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;

    // Re-insert scripts
    saved.forEach(function(info) {
      info.parent.insertBefore(info.el, info.next);
    });

    if (wasEditing) enableEditing();

    window.parent.postMessage({ type: 'vivecura-editor-html-result', html: html }, '*');
  }

  // Listen for parent commands
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'vivecura-editor-toggle') {
      if (e.data.enabled) enableEditing();
      else disableEditing();
    }
    if (e.data.type === 'vivecura-editor-get-html') {
      extractHtml();
    }
  });
})();
</script>`;

    if (htmlContent.includes("</body>")) {
      return htmlContent.replace("</body>", editorScript + "</body>");
    }

    return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;">${htmlContent}${editorScript}</body>
</html>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#43a9ab]/30 border-t-[#43a9ab] rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen pt-16">
      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/admin"
              className="flex-shrink-0 text-[#515757]/40 hover:text-[#43a9ab] transition-colors no-underline"
              onClick={(e) => {
                if (hasChanges) {
                  if (!window.confirm("Ungespeicherte Änderungen verwerfen?")) {
                    e.preventDefault();
                  }
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-sm font-medium text-[#515757] truncate">
              {post.title}
            </h1>
            {!post.published && (
              <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 font-medium">
                Entwurf
              </span>
            )}
          </div>

          {/* Right: edit toggle + save */}
          <div className="flex items-center gap-3">
            {/* Edit mode toggle */}
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                editMode
                  ? "bg-[#43a9ab] text-white"
                  : "bg-gray-50 text-[#515757]/60 hover:bg-gray-100"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              {editMode ? "Bearbeitung aktiv" : "Bearbeiten"}
            </button>

            {/* Save button */}
            <button
              onClick={requestSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                hasChanges
                  ? "bg-[#43a9ab] text-white hover:bg-[#3a9597]"
                  : "bg-gray-50 text-[#515757]/30 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Speichern...
                </>
              ) : saved ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Gespeichert
                </>
              ) : (
                "Speichern"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={getEditorIframeContent(post.html_content)}
        title={post.title}
        className="w-full border-0"
        style={{ height: `${iframeHeight}px`, minHeight: "400px" }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

export default BlogEditor;
