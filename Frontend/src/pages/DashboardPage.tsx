import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface SecretRow {
  secret_id: string;
  label: string;
  expiry: string;
  max_views: number;
  password_protected: boolean;
  status: string;
  created_at: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboardSecrets()
      .then((res) => setSecrets(res.secrets as unknown as SecretRow[]))
      .catch(() => setSecrets([]))
      .finally(() => setLoading(false));
  }, []);

  const pill = (status: string) => {
    const map: Record<string, string> = {
      active: "pill-active", viewed: "pill-viewed", expired: "pill-expired",
    };
    return <span className={`pill ${map[status] ?? "pill-viewed"}`}><span className="dot" />{status}</span>;
  };

  return (
    <div className="main">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <div className="eyebrow">Your vault</div>
            <h2 className="h2">Secrets you've created</h2>
            <p className="dim mono" style={{ fontSize: 13, marginTop: 6 }}>{user?.email}</p>
          </div>
          <Link to="/" className="btn btn-primary">New secret</Link>
        </div>

        {loading ? (
          <div className="card center"><span className="spinner spinner-light" /></div>
        ) : secrets.length === 0 ? (
          <div className="card card-pad-lg center">
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗝️</div>
            <h2 className="h2">No secrets yet</h2>
            <p className="dim" style={{ marginTop: 10 }}>
              Create your first encrypted, self-destructing secret.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Create one</Link>
          </div>
        ) : (
          <div className="stack gap-16">
            {secrets.map((s) => (
              <div
                key={s.secret_id}
                className="card"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {s.label}
                    {s.password_protected && (
                      <span className="faint mono" style={{ fontSize: 11, marginLeft: 8 }}>🔑 password</span>
                    )}
                  </div>
                  <div className="faint mono" style={{ fontSize: 12 }}>
                    expires {s.expiry} · burn after {s.max_views} ·{" "}
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>
                {pill(s.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
