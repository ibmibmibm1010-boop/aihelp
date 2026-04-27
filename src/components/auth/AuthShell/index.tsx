import type { ReactNode } from "react";
import "../../../auth.css";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__bg" aria-hidden />
      <div className="auth-shell__content">{children}</div>
    </div>
  );
}
