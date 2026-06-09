import { useState } from "react";
import { encryptSecret } from "../lib/crypto";
import { api } from "../lib/api";
import { useToast } from "../components/ui";

export function HomePage() {
  const [plaintext, setPlaintext] = useState("");
  const [expiry, setExpiry] = useState("1d");
  const [label, setLabel] = useState("");
  const [maxViews, setMaxViews] = useState(1);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const { show, node } = useToast();

  const create = async () => {
    if (!plaintext.trim()) { show("Enter a secret first", "error"); return; }
    setBusy(true);
    try {
      // Encrypt in the browser. The key never leaves the client.
      const { ciphertext, keyFragment } = await encryptSecret(
        plaintext,
        usePassword ? password : undefined
      );
      const { id } = await api.createSecret({
        ciphertext,
        expiry,
        label: label || undefined,
        maxViews,
        passwordProtected: usePassword,
      });
      // Key goes in the URL fragment (#) — never sent to the server.
      const base = `${window.location.origin}/s/${id}`;
      setLink(usePassword ? base : `${base}#${keyFragment}`);
      setPlaintext("");
    } catch (e) {
      show((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (link) { await navigator.clipboard.writeText(link); show("Link copied"); }
  };

  return (
    <div className="main">
      <div className="container">
        <div className="eyebrow">Zero-knowledge · self-destructing</div>
        <h1 className="h1">
          Share a secret.<br />
          <span style={{ color: "var(--signal)" }}>It vanishes after reading.</span>
        </h1>
        <p className="lead" style={{ margin: "20px 0 40px", maxWidth: 560 }}>
          Passwords, API keys, private notes. Encrypted in your browser, opened
          once, then gone forever. The server only ever sees ciphertext —
          even we can't read it.
        </p>

        {link ? (
          <div className="card card-pad-lg fade-in" style={{ maxWidth: 640 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>One-time link ready</div>
            <p className="dim" style={{ marginBottom: 18, fontSize: 14 }}>
              Send this link to your recipient. It self-destructs after
              {maxViews > 1 ? ` ${maxViews} views` : " one view"} or when it expires.
            </p>
            <div className="linkbox" style={{ marginBottom: 16 }}>{link}</div>
            <div className="row">
              <button className="btn btn-primary" onClick={copy}>Copy link</button>
              <button className="btn btn-ghost" onClick={() => setLink(null)}>
                Create another
              </button>
            </div>
            {usePassword && (
              <p className="faint" style={{ fontSize: 13, marginTop: 16 }}>
                Remember to share the password separately — the link alone
                won't open it.
              </p>
            )}
          </div>
        ) : (
          <div className="card card-pad-lg" style={{ maxWidth: 640 }}>
            <div className="field">
              <label className="label">Your secret</label>
              <textarea
                className="textarea"
                placeholder="Paste a password, API key, or private note…"
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
              />
            </div>

            <div className="row">
              <div className="field">
                <label className="label">Expires after</label>
                <select className="select" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
                  <option value="1h">1 hour</option>
                  <option value="1d">1 day</option>
                  <option value="7d">7 days</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Burn after</label>
                <select
                  className="select"
                  value={maxViews}
                  onChange={(e) => setMaxViews(Number(e.target.value))}
                >
                  <option value={1}>1 view</option>
                  <option value={3}>3 views</option>
                  <option value={5}>5 views</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label">Label (optional)</label>
              <input
                className="input"
                placeholder="e.g. Staging DB password"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="field">
              <label
                className="label"
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  style={{ width: "auto" }}
                />
                Add password protection
              </label>
              {usePassword && (
                <input
                  className="input"
                  type="password"
                  placeholder="Passphrase the recipient must enter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ marginTop: 10 }}
                />
              )}
            </div>

            <button className="btn btn-primary btn-block" onClick={create} disabled={busy}>
              {busy ? <span className="spinner" /> : "Encrypt & create link"}
            </button>
          </div>
        )}
      </div>
      {node}
    </div>
  );
}
