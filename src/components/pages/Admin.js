"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminContactsPanel from "@/components/AdminContactsPanel";
import AdminLifesummitPanel from "@/components/AdminLifesummitPanel";
import AdminBlogPanel from "@/components/AdminBlogPanel";
import AdminAnamnesePanel from "@/components/AdminAnamnesePanel";

function Admin() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("patients");
  const [newContactsCount, setNewContactsCount] = useState(0);
  const [newLifesummitCount, setNewLifesummitCount] = useState(0);

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch new contacts count when logged in (for tab badge)
  useEffect(() => {
    if (!session) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("contact_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      setNewContactsCount(count || 0);
    };
    fetchCount();
  }, [session, activeTab]);

  // Fetch Lifesummit count (incomplete = not final) for tab badge
  useEffect(() => {
    if (!session) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("lifesummit_submissions")
        .select("*", { count: "exact", head: true })
        .neq("status", "final");
      setNewLifesummitCount(count || 0);
    };
    fetchCount();
  }, [session, activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#43a9ab]/30 border-t-[#43a9ab] rounded-full animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div className="min-h-screen pt-24 flex items-start justify-center px-4">
        <div className="w-full max-w-sm mt-20">
          <h1 className="text-2xl font-light text-[#515757] mb-1 text-center">Admin</h1>
          <div className="w-10 h-[2px] bg-[#43a9ab]/40 mx-auto mb-8" />

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#515757]/60 mb-1.5 tracking-wider uppercase">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#515757]/60 mb-1.5 tracking-wider uppercase">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-[#515757] focus:outline-none focus:border-[#43a9ab] transition-colors"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-xs text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#43a9ab] text-white text-sm font-medium rounded-lg hover:bg-[#3a9597] transition-colors duration-300"
            >
              Anmelden
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen pt-3 pb-12 px-6">
      <div className="w-full">
        {/* Tab nav — logout sits at the right of the same row (no separate header) */}
        <div className="flex items-center justify-between gap-4 mb-4 border-b border-gray-100">
          <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("patients")}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "patients"
                ? "text-[#43a9ab] border-b-2 border-[#43a9ab] -mb-px"
                : "text-[#515757]/50 hover:text-[#515757]"
            }`}
          >
            Patienten
          </button>
          <button
            onClick={() => setActiveTab("blog")}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "blog"
                ? "text-[#43a9ab] border-b-2 border-[#43a9ab] -mb-px"
                : "text-[#515757]/50 hover:text-[#515757]"
            }`}
          >
            Blog verwalten
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "contacts"
                ? "text-[#43a9ab] border-b-2 border-[#43a9ab] -mb-px"
                : "text-[#515757]/50 hover:text-[#515757]"
            }`}
          >
            Kontakte
            {newContactsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {newContactsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("lifesummit")}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "lifesummit"
                ? "text-[#43a9ab] border-b-2 border-[#43a9ab] -mb-px"
                : "text-[#515757]/50 hover:text-[#515757]"
            }`}
          >
            Lifesummit
            {newLifesummitCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                {newLifesummitCount}
              </span>
            )}
          </button>
          </div>
          <div className="shrink-0 flex items-center gap-4 pb-2">
            <a
              href="/"
              className="flex items-center gap-1 text-xs text-[#515757]/40 hover:text-[#43a9ab] transition-colors tracking-wider uppercase"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Home
            </a>
            <button
              onClick={handleLogout}
              className="text-xs text-[#515757]/40 hover:text-[#515757] transition-colors tracking-wider uppercase"
            >
              Abmelden
            </button>
          </div>
        </div>

        {activeTab === "patients" && <AdminAnamnesePanel />}

        {activeTab === "contacts" && <AdminContactsPanel />}

        {activeTab === "lifesummit" && <AdminLifesummitPanel />}

        {activeTab === "blog" && <AdminBlogPanel />}
      </div>
    </div>
  );
}

export default Admin;
