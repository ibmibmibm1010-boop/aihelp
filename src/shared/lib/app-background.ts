/** Фон приложения: `public/app-bg.jpg` или переопределение через `VITE_AUTH_HERO_URL`. */
export function getAppBackgroundUrl(): string {
  const override = import.meta.env.VITE_AUTH_HERO_URL?.trim();
  if (override) return override;
  return `${import.meta.env.BASE_URL}app-bg.jpg`;
}
