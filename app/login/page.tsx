"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";

const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

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
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/check").then(r => { if (r.ok) router.replace(from); }).catch(() => {});
  }, [from, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" style={{ background: "#E2E8F0" }}>

      {/* Particle bg */}
      <ParticleCanvas className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      <div className="relative z-10 w-full" style={{ maxWidth: 380 }}>

        {/* Logo mark */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ padding: "1px", borderRadius: 18, background: "linear-gradient(135deg, #D1FAE5 0%, rgba(255,255,255,.2) 50%, #92AFA0 100%)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(5,150,105,.3)" }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2L4 6.5V12c0 4.477 3.582 8.09 8 8.937C16.418 20.09 20 16.477 20 12V6.5L12 2Z"
                  stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ padding: "1px", borderRadius: 14, background: "linear-gradient(135deg, rgb(226,232,240) 0%, rgba(248,250,252,.2) 50%, rgba(203,213,225,.8) 100%)" }}>
          <div style={{ borderRadius: 13, background: "rgba(255,255,255,.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: "36px 32px", boxShadow: "rgba(0,0,0,.05) 0px 1px 2px, rgba(0,0,0,.05) 0px 4px 24px -8px" }}>

            <h1 style={{ fontFamily: "var(--font-newsreader,serif)", fontSize: 28, fontWeight: 300, letterSpacing: "-0.025em", color: "#4F4F50", margin: "0 0 4px" }}>
              Willkommen zurück
            </h1>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 28px" }}>
              Bitte gib dein Passwort ein um fortzufahren.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                  Passwort
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoFocus
                    autoComplete="current-password"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      paddingLeft: 14, paddingRight: 40, paddingTop: 11, paddingBottom: 11,
                      border: "1px solid #CBD5E1", borderRadius: 8,
                      fontSize: 14, color: "#64748B",
                      background: "rgba(255,255,255,.85)",
                      outline: "none", transition: "border .15s, box-shadow .15s",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#92AFA0"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(209,250,229,.5)"; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, fontSize: 12, color: "#BE123C", fontWeight: 500 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 9999, background: "#F43F5E", flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                style={{
                  width: "100%", padding: "12px",
                  background: loading || !password.trim() ? "#E8E9EA" : "#059669",
                  color: loading || !password.trim() ? "#A2A3A4" : "#fff",
                  border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: loading || !password.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: !loading && password.trim() ? "0 1px 2px rgba(0,0,0,.05), 0 4px 20px -8px rgba(5,150,105,.3)" : "none",
                  transition: "all .2s ease",
                }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Wird angemeldet…</> : "Anmelden"}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#C8C8C9", marginTop: 20 }}>
          Nur für autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}
