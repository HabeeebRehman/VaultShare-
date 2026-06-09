import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ui";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { show, node } = useToast();

  const submit = async () => {
    if (!name || !email || !message) { show("All fields are required", "error"); return; }
    setBusy(true);
    try {
      await api.contact({ name, email, message });
      setSent(true);
      show("Message received — check your inbox for confirmation");
    } catch (e) {
      show((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="main">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="eyebrow">Get in touch</div>
        <h2 className="h2" style={{ marginBottom: 8 }}>Contact & feedback</h2>
        <p className="dim" style={{ marginBottom: 28 }}>
          Questions, bug reports, or feature ideas — we read everything.
        </p>

        {sent ? (
          <div className="card card-pad-lg center fade-in">
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 className="h2">Message received</h2>
            <p className="dim" style={{ marginTop: 12 }}>
              Thanks, {name.split(" ")[0]}. We've sent a confirmation to {email}.
            </p>
            <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => {
              setSent(false); setName(""); setEmail(""); setMessage("");
            }}>
              Send another
            </button>
          </div>
        ) : (
          <div className="card card-pad-lg">
            <div className="row">
              <div className="field">
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
            <div className="field">
              <label className="label">Message</label>
              <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's on your mind?" />
            </div>
            <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
              {busy ? <span className="spinner" /> : "Send message"}
            </button>
          </div>
        )}
      </div>
      {node}
    </div>
  );
}
