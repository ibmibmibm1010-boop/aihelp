import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isValidEmail } from "../authValidation";
import { authErrorToRu } from "../lib/authErrorMessage";
import { supabase } from "../lib/supabaseClient";
import { AuthCard, AuthShell } from "../components/auth";

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) {
        return;
      }
      navigate("/account", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = "Введите email";
    } else if (!isValidEmail(email)) {
      next.email = "Некорректный email";
    }

    if (!password) {
      next.password = "Введите пароль";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (error) {
      setFormError(authErrorToRu(error));
      return;
    }

    navigate("/account", { replace: true });
  }

  async function handleResendConfirmation() {
    setResendMessage(null);
    setFormError(null);

    if (!email.trim()) {
      setResendMessage("Введите email в поле выше.");
      return;
    }
    if (!isValidEmail(email)) {
      setResendMessage("Укажите корректный email.");
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    setResending(false);

    if (error) {
      setResendMessage(authErrorToRu(error));
      return;
    }

    setResendMessage("Письмо отправлено. Проверьте почту и папку «Спам».");
  }

  return (
    <AuthShell>
      <AuthCard
        title="Вход"
        subtitle="Войдите в аккаунт, чтобы продолжить работу с доской."
      >
        {formError ? (
          <p className="auth-banner auth-banner--error" role="alert">
            {formError}
          </p>
        ) : null}
        {resendMessage ? (
          <p
            className={
              resendMessage.startsWith("Письмо отправлено")
                ? "auth-banner auth-banner--success"
                : "auth-banner auth-banner--error"
            }
            role="status"
          >
            {resendMessage}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className={`auth-input${errors.email ? " auth-input--error" : ""}`}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
            />
            {errors.email ? (
              <p className="auth-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              Пароль
            </label>
            <input
              id="login-password"
              className={`auth-input${errors.password ? " auth-input--error" : ""}`}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="••••••••"
            />
            {errors.password ? (
              <p className="auth-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="auth-row">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(ev) => setRemember(ev.target.checked)}
              />
              Запомнить меня
            </label>
            <a className="auth-link" href="#">
              Забыли пароль?
            </a>
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </button>
        </form>

        <p className="auth-footer">
          <button
            type="button"
            className="auth-footer__action"
            disabled={resending}
            onClick={() => void handleResendConfirmation()}
          >
            {resending ? "Отправка…" : "Отправить письмо подтверждения ещё раз"}
          </button>
        </p>
        <p className="auth-footer">
          Нет аккаунта?{" "}
          <Link className="auth-link" to="/register">
            Регистрация
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
