import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { decryptSecret } from "../lib/crypto";
import { api } from "../lib/api";

type State =
  | { phase: "loading" }
  | { phase: "ready"; passwordProtected: boolean }
  | { phase: "revealed"; text: string; burned: boolean; viewsLeft: number }
  | { phase: "gone" }
  | { phase: "error"; message: string };

export function RevealPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [password, setPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);

  // The key lives in the URL fragment, never sent to the server.
  const keyFragment = window.location.hash.slice(1) || undefined;

  useEffect(() => {
    if (!id) return;
    api
      .secretStatus(id)
      .then(() => setState({ phase: "ready", passwordProtected: !keyFragment }))
      .catch(() => setState({ phase: "gone" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const reveal = async () => {
    if (!id) return;
    setDecrypting(true);
    try {
      // Consuming burns the secret on the server (atomic GETDEL).
      const res = await api.consumeSecret(id);
      const text = await decryptSecret(res.ciphertext, {
        keyFragment,
        password: res.passwordProtected ? password : undefined,
      });
      setState({
        phase: "revealed",
        text,
        burned: res.burned,
        viewsLeft: res.viewsLeft,
      });
    } catch (e) {
      // If decryption fails it's almost always a wrong password.
      const msg = (e as Error).message.includes("operation-specific")
        ? "Wrong password — and the secret has now been consumed."
        : (e as Error).message;
      setState({ phase: "error", message: msg });
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="main">
      <div className="container" style={{ maxWidth: 600 }}>
        {state.phase === "loading" && (
          <div className="card center">
            <div className="dim">Locating secret…</div>
          </div>
        )}

        {state.phase === "gone" && (
          <div className="card card-pad-lg center fade-in">
            <div style={{ fontSize: 40, marginBottom: 12 }}>💨</div>
            <h2 className="h2">This secret is gone</h2>
            <p className="dim" style={{ marginTop: 12 }}>
              It was already viewed, or it expired and self-destructed. Secrets
              can never be recovered — that's the point.
            </p>
          </div>
        )}

        {state.phase === "ready" && (
          <div className="card card-pad-lg fade-in">
            <div className="eyebrow">Encrypted secret</div>
            <h2 className="h2">Someone shared a secret with you</h2>
            <p className="dim" style={{ margin: "12px 0 24px" }}>
              Revealing it will <strong style={{ color: "var(--warn)" }}>permanently
              destroy</strong> it. Make sure you're ready to copy it now.
            </p>
            {state.passwordProtected && (
              <div className="field">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter the password you were given"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              onClick={reveal}
              disabled={decrypting || (state.passwordProtected && !password)}
            >
              {decrypting ? <span className="spinner" /> : "Reveal & destroy"}
            </button>
          </div>
        )}

        {state.phase === "revealed" && (
          <div className="card card-pad-lg fade-in">
            <div className="eyebrow" style={{ color: state.burned ? "var(--danger)" : "var(--signal)" }}>
              {state.burned ? "Destroyed — this was the last view" : `${state.viewsLeft} views left`}
            </div>
            <div className="linkbox" style={{ margin: "8px 0 18px", whiteSpace: "pre-wrap" }}>
              {state.text}
            </div>
            <button
              className="btn btn-ghost btn-block"
              onClick={() => navigator.clipboard.writeText(state.text)}
            >
              Copy to clipboard
            </button>
            {state.burned && (
              <p className="faint center" style={{ fontSize: 13, marginTop: 16 }}>
                This link will no longer work. If you reload, the secret is gone.
              </p>
            )}
          </div>
        )}

        {state.phase === "error" && (
          <div className="card card-pad-lg center fade-in">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 className="h2">Couldn't open this</h2>
            <p className="dim" style={{ marginTop: 12 }}>{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
