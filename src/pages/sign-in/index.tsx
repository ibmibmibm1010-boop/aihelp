import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Location } from "react-router-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { signInWithGoogle } from "@shared/api";
import { getApiErrorMessage, AuthProfileError, useAuth } from "@shared/lib";
import { AuthScaffold, GoogleSignInButton } from "@shared/ui";

type LocationState = {
  registered?: boolean;
  pendingEmailConfirm?: boolean;
  oauthError?: boolean;
  from?: Location;
};

const getPostLoginPath = (state: LocationState | null): string => {
  const from = state?.from;
  if (
    from?.pathname &&
    from.pathname !== "/sign-in" &&
    from.pathname !== "/sign-up"
  ) {
    return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
  }
  return "/boards";
};

const inputClass =
  "w-full rounded-vibe border border-vibe-line bg-white px-4 py-3 text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-vibe-purple focus:ring-2 focus:ring-vibe-purple/25";

const SignInPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isInitializing } = useAuth();

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loc = location.state as LocationState | null;
  const registered = loc?.registered === true;
  const pendingEmailConfirm = loc?.pendingEmailConfirm === true;
  const oauthError = loc?.oauthError === true;

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate(getPostLoginPath(loc), { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate, loc]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setLoading(true);
    try {
      await login({ email, password });
      navigate(getPostLoginPath(loc), { replace: true });
    } catch (err) {
      if (err instanceof AuthProfileError) {
        setError(t("auth.errors.profileLoad"));
      } else {
        setError(getApiErrorMessage(err, { signIn: true }));
      }
    } finally {
      setLoading(false);
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

  return (
    <AuthScaffold title={t("auth.signIn.title")} description={t("auth.signIn.description")}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        {pendingEmailConfirm ? (
          <p
            className="rounded-vibe border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
            role="status"
          >
            {t("auth.signIn.pendingEmail")}
          </p>
        ) : registered ? (
          <p
            className="rounded-vibe border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {t("auth.signIn.registeredOk")}
          </p>
        ) : null}

        {oauthError ? (
          <p
            className="rounded-vibe border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            {t("auth.signIn.oauthFail")}
          </p>
        ) : null}

        {error ? (
          <p
            className="rounded-vibe border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <GoogleSignInButton
          disabled={loading || googleLoading}
          onClick={() => void handleGoogle()}
          label={t("auth.signIn.google")}
        />

        <div className="relative py-2 text-center text-xs text-vibe-muted">
          <span className="relative z-10 bg-white px-2">{t("common.or")}</span>
          <span
            className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-vibe-line"
            aria-hidden
          />
        </div>

        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-sm font-medium text-ink">
            {t("common.email")}
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signin-password" className="mb-1.5 block text-sm font-medium text-ink">
            {t("common.password")}
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-vibe-muted">{t("auth.signIn.passwordHint")}</p>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="mt-1 w-full rounded-vibe bg-vibe-purple py-3.5 text-sm font-semibold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-vibe-muted">
        {t("auth.signIn.noAccount")}{" "}
        <Link to="/sign-up" className="font-semibold text-vibe-purple hover:underline">
          {t("auth.signIn.registerLink")}
        </Link>
      </p>
    </AuthScaffold>
  );
};

export default SignInPage;
