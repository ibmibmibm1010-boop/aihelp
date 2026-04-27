import type { ReactNode } from "react";

import { getAppBackgroundUrl } from "@shared/lib/app-background";

type AuthScaffoldProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export function AuthScaffold({ children, title, description }: AuthScaffoldProps) {
  const heroUrl = getAppBackgroundUrl();

  return (
    <div className="flex min-h-screen flex-col bg-vibe-canvas md:flex-row">
      <div className="relative order-2 flex min-h-[220px] flex-1 flex-col md:order-1 md:min-h-screen md:max-w-[52%]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${heroUrl}")` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/75 via-white/55 to-violet-100/40 backdrop-blur-[2px]"
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col justify-end p-8 md:justify-center md:p-12 lg:p-16">
          <p className="inline-flex w-fit items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            AI Vibe Board
          </p>
          <h2 className="mt-4 max-w-lg text-2xl font-bold leading-tight tracking-tight text-ink md:text-3xl lg:text-4xl">
            Управляй задачами силой ИИ, а не микроменеджмента
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-vibe-muted">
            Спокойный интерфейс, фокус на сути и умные подсказки — без лишнего шума.
          </p>
        </div>
      </div>

      <div className="order-1 flex flex-1 items-center justify-center px-4 py-10 md:order-2 md:px-8 md:py-12">
        <div className="w-full max-w-md rounded-vibe border border-vibe-line bg-white p-8 shadow-[0_20px_50px_-12px_rgba(157,39,255,0.12)] sm:p-10">
          <h1 className="text-center text-2xl font-bold tracking-tight text-ink md:text-left">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-center text-sm leading-relaxed text-vibe-muted md:text-left">
              {description}
            </p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
