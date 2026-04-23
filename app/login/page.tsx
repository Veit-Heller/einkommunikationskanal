"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") || "/";

  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/check").then(r => {
      if (r.ok) router.replace(from);
    }).catch(() => {});
  }, [from, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.replace(from === "/login" ? "/" : from);
      } else {
        const data = await res.json();
        setError(data.error || "Falsches Passwort");
      }
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    padding: "10px 16px",
    fontSize: "14px",
    outline: "none",
    transition: "all 150ms ease",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#F2EAD3" }}
          >
            <Icon icon="solar:bolt-linear" style={{ color: "#000000", width: 28, height: 28 }} />
          </div>
        </div>

        {/* Card with gradient border */}
        <div
          style={{
            padding: "1px",
            borderRadius: "24px",
            background: "var(--gradient-border)",
            boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 20px 25px -5px, rgba(0,0,0,0.1) 0px 8px 10px -6px, rgba(0,0,0,0.25) 0px 25px 50px -12px",
          }}
        >
          <div style={{ borderRadius: "23px", background: "var(--surface)", padding: "32px" }}>
            <h1
              className="text-xl mb-1"
              style={{ color: "var(--text-primary)", fontWeight: 400, letterSpacing: "-0.025em" }}
            >
              Willkommen zurück
            </h1>
            <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
              Bitte gib dein Passwort ein um fortzufahren.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{ ...inputStyle, paddingRight: "40px" }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(242,234,211,0.4)"; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--input-border)"; }}
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Icon
                      icon={showPw ? "solar:eye-closed-linear" : "solar:eye-linear"}
                      style={{ width: 16, height: 16 }}
                    />
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
                >
                  <Icon icon="solar:danger-triangle-linear" style={{ width: 14, height: 14, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-3 font-semibold rounded-full flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "#F2EAD3",
                  color: "#000000",
                  borderRadius: "9999px",
                  opacity: (loading || !password.trim()) ? 0.5 : 1,
                  cursor: (loading || !password.trim()) ? "not-allowed" : "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full animate-spin"
                      style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000000" }}
                    />
                    Wird angemeldet...
                  </>
                ) : (
                  "Anmelden"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-dim)" }}>
          Nur für autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}
