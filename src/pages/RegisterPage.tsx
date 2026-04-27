import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
} from "../authValidation";
import { authErrorToRu } from "../lib/authErrorMessage";
import { supabase } from "../lib/supabaseClient";
import { AuthCard, AuthShell } from "../components/auth";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setFormSuccess(null);

    const next: FieldErrors = {};

    if (!name.trim()) {
      next.name = "Введите имя";
    }

    if (!email.trim()) {
      next.email = "Введите email";
    } else if (!isValidEmail(email)) {
      next.email = "Некорректный email";
    }

    if (!password) {
      next.password = "Придумайте пароль";
    } else if (!isValidPassword(password)) {
      next.password = `Минимум ${MIN_PASSWORD_LENGTH} символов`;
    }

    if (!confirm) {
      next.confirm = "Подтвердите пароль";
    } else if (confirm !== password) {
      next.confirm = "Пароли не совпадают";
    }

    if (!terms) {
      next.terms = "Нужно согласие с условиями";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });
    setSubmitting(false);

    if (error) {
      setFormError(authErrorToRu(error));
      return;
    }

    if (data.session) {
      navigate("/account", { replace: true });
      return;
    }

    setFormSuccess(
      "Аккаунт создан. Если включено подтверждение email, проверьте почту и перейдите по ссылке, затем войдите.",
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title="Регистрация"
        subtitle="Создайте аккаунт и соберите свою AI-доску вдохновения."
      >
        {formError ? (
          <p className="auth-banner auth-banner--error" role="alert">
            {formError}
          </p>
        ) : null}
        {formSuccess ? (
          <p className="auth-banner auth-banner--success" role="status">
            {formSuccess}
          </p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-name">
              Имя
            </label>
            <input
              id="register-name"
              className={`auth-input${errors.name ? " auth-input--error" : ""}`}
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="Как к вам обращаться"
            />
            {errors.name ? (
              <p className="auth-error" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
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
            <label className="auth-label" htmlFor="register-password">
              Пароль
            </label>
            <input
              id="register-password"
              className={`auth-input${errors.password ? " auth-input--error" : ""}`}
              type="password"
              name="password"
              autoComplete="new-password"
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

          <div className="auth-field">
            <label className="auth-label" htmlFor="register-confirm">
              Подтверждение пароля
            </label>
            <input
              id="register-confirm"
              className={`auth-input${errors.confirm ? " auth-input--error" : ""}`}
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              placeholder="Повторите пароль"
            />
            {errors.confirm ? (
              <p className="auth-error" role="alert">
                {errors.confirm}
              </p>
            ) : null}
          </div>

          <div className="auth-field">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={terms}
                onChange={(ev) => setTerms(ev.target.checked)}
              />
              Согласен с условиями использования
            </label>
            {errors.terms ? (
              <p className="auth-error" role="alert">
                {errors.terms}
              </p>
            ) : null}
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Создание…" : "Создать аккаунт"}
          </button>
        </form>

        <p className="auth-footer">
          Уже есть аккаунт?{" "}
          <Link className="auth-link" to="/login">
            Войти
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
