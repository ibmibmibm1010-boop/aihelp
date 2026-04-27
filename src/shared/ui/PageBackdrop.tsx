import type { ReactNode } from "react";

import { getAppBackgroundUrl } from "@shared/lib/app-background";

type PageBackdropProps = {
  children: ReactNode;
};

export function PageBackdrop({ children }: PageBackdropProps) {
  const url = getAppBackgroundUrl();

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${url}")` }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-white/90 via-vibe-canvas/88 to-violet-100/50"
        aria-hidden
      />
      {children}
    </div>
  );
}
