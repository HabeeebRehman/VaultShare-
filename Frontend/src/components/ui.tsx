import { Link, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export function Nav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">🔒</span> VaultShare
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
              <Link to="/contact" className="btn btn-ghost">Contact</Link>
              <button
                className="btn btn-ghost"
                onClick={async () => { await signOut(); navigate("/"); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/contact" className="btn btn-ghost">Contact</Link>
              <Link to="/login" className="btn btn-primary">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Wraps a route so unauthenticated users are bounced to /login (Mandate 1). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="main container center">
        <div className="dim">Checking your session…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

type ToastKind = "success" | "error";
export function useToast() {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const show = (msg: string, kind: ToastKind = "success") => setToast({ msg, kind });
  const node = toast ? (
    <div className={`toast toast-${toast.kind}`}>{toast.msg}</div>
  ) : null;
  return { show, node };
}
