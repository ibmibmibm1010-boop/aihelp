import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-card">
      <div className="auth-card__badge">★ AI Vibe Board</div>
      <h1 className="auth-card__title">{title}</h1>
      {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
      {children}
    </div>
  );
}
