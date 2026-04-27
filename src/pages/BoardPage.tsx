import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import "../auth.css";

export function BoardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) {
        return;
      }
      setSession(s);
      setLoading(false);
      if (!s) {
        navigate("/login", { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="auth-app">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const displayName =
    (typeof session.user.user_metadata?.full_name === "string"
      ? session.user.user_metadata.full_name
      : null) || session.user.email;

  return (
    <div className="auth-app">
      <h1>Добро пожаловать</h1>
      <p>
        Вы вошли как <strong>{displayName}</strong>
        {session.user.email ? ` (${session.user.email})` : null}.
      </p>
      <div className="auth-app__actions">
        <button type="button" className="auth-submit" onClick={handleSignOut}>
          Выйти
        </button>
      </div>
    </div>
  );
}
