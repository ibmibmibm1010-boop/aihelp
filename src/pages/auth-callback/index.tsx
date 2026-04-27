import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { Session } from "@supabase/supabase-js";

import { syncUserAfterAuth } from "@shared/lib/auth-store";
import { getSupabase } from "@shared/lib/supabase-client";

const AuthCallbackPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState(() => t("auth.callback.finishing"));

  useEffect(() => {
    const supabase = getSupabase();
    let finished = false;

    const finishOk = async (session: Session | null) => {
      if (finished || !session) return;
      finished = true;
      const synced = await syncUserAfterAuth();
      if (synced) {
        navigate("/boards", { replace: true });
      } else {
        setMessage(t("auth.callback.profileFail"));
        navigate("/sign-in", { replace: true, state: { oauthError: true } });
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => finishOk(session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void finishOk(session);
    });

    const timeout = window.setTimeout(() => {
      if (finished) return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (finished) return;
        if (session) void finishOk(session);
        else {
          finished = true;
          setMessage(t("auth.callback.incomplete"));
          navigate("/sign-in", { replace: true, state: { oauthError: true } });
        }
      });
    }, 12_000);

    return () => {
      finished = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-vibe-canvas text-vibe-muted">
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default AuthCallbackPage;
