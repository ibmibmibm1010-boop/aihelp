import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { signInWithGoogle, signUp } from "@shared/api";
import { getApiErrorMessage, useAuth } from "@shared/lib";
import { syncUserAfterAuth } from "@shared/lib/auth-store";
import { AuthScaffold, GoogleSignInButton } from "@shared/ui";

const inputClass =
  "w-full rounded-vibe border border-vibe-line bg-white px-4 py-3 text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-vibe-purple focus:ring-2 focus:ring-vibe-purple/25";

const SignUpPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isInitializing, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoutForNewAccount = async () => {
    setError(null);
    await logout();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (password.length < 8) {
      setError(t("auth.signUp.passwordShort"));
      return;
    }

    setIsLoading(true);
    try {
      const { session } = await signUp({ username, email, password });
      if (session) {
        const synced = await syncUserAfterAuth();
        if (synced) {
          navigate("/boards", { replace: true });
        } else {
          setError(t("auth.signUp.syncFail"));
        }
      } else {
        navigate("/sign-in", {
          replace: true,
          state: { registered: true, pendingEmailConfirm: true },
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vibe-canvas text-vibe-muted">
        {t("common.loading")}
      </div>
    );
  }

  if (isAuthenticated && currentUser) {
    return (
      <AuthScaffold title={t("auth.signUp.title")} description={t("auth.signUp.description")}>
        <div
          className="mb-6 space-y-4 rounded-vibe border border-vibe-line bg-vibe-canvas/80 px-4 py-4 text-sm text-ink"
          role="status"
        >
          <p>{t("auth.signUp.loggedInHint", { email: currentUser.email })}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleLogoutForNewAccount()}
              className="rounded-vibe border border-vibe-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
            >
              {t("auth.signUp.logoutAndNew")}
            </button>
            <Link
              to="/boards"
              className="inline-flex items-center rounded-vibe bg-vibe-purple px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              {t("auth.signUp.toBoards")}
            </Link>
          </div>
        </div>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title={t("auth.signUp.title")} description={t("auth.signUp.description")}>
      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
        {error ? (
          <p
            className="rounded-vibe border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <GoogleSignInButton
          disabled={isLoading || googleLoading}
          onClick={() => void handleGoogle()}
          label={t("auth.signUp.google")}
        />

        <div className="relative py-2 text-center text-xs text-vibe-muted">
          <span className="relative z-10 bg-white px-2">{t("common.or")}</span>
          <span
            className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-vibe-line"
            aria-hidden
          />
        </div>

        <div>
          <label htmlFor="signup-username" className="mb-1.5 block text-sm font-medium text-ink">
            {t("auth.signUp.username")}
          </label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={1}
            maxLength={255}
            placeholder={t("auth.signUp.usernamePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-ink">
            {t("common.email")}
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-ink">
            {t("common.password")}
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-vibe-muted">{t("auth.signUp.passwordHint")}</p>
        </div>

        <button
          type="submit"
          disabled={isLoading || googleLoading}
          className="mt-1 w-full rounded-vibe bg-vibe-purple py-3.5 text-sm font-semibold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-vibe-muted">
        {t("auth.signUp.hasAccount")}{" "}
        <Link to="/sign-in" className="font-semibold text-vibe-purple hover:underline">
          {t("auth.signUp.signInLink")}
        </Link>
      </p>
    </AuthScaffold>
  );
};

export default SignUpPage;
