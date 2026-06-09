import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { useToast } from "../components/ui";

export function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { show, node } = useToast();

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Trigger the welcome email (Mandate 3). Session may be active
        // immediately if email confirmation is disabled in Supabase.
        try { await api.sendWelcome(); } catch { /* ignore if no session yet */ }
        show("Account created — check your inbox");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (e) {
      show((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="main">
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="card card-pad-lg fade-in">
          <div className="eyebrow">{mode === "signup" ? "Create account" : "Welcome back"}</div>
          <h2 className="h2" style={{ marginBottom: 24 }}>
            {mode === "signup" ? "Start sharing securely" : "Sign in to VaultShare"}
          </h2>

          <button className="btn btn-ghost btn-block" onClick={google} style={{ marginBottom: 18 }}>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 18px" }}>
            <hr className="divider" style={{ flex: 1, margin: 0 }} />
            <span className="faint mono" style={{ fontSize: 11 }}>OR</span>
            <hr className="divider" style={{ flex: 1, margin: 0 }} />
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input
              className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <p className="dim center" style={{ fontSize: 14, marginTop: 20 }}>
            {mode === "signup" ? "Already have an account?" : "No account yet?"}{" "}
            <button
              className="mono"
              style={{ color: "var(--signal)" }}
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
      {node}
    </div>
  );
}
