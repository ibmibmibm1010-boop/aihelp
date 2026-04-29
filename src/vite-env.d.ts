/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Опционально: базовый URL REST API (если подключите свой бэкенд) */
  readonly VITE_API_URL?: string;
  /** URL проекта Supabase */
  readonly VITE_SUPABASE_URL?: string;
  /** Публичный anon / publishable key из Supabase */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** URL фона на страницах входа/регистрации (например `/landing-hero.jpg`) */
  readonly VITE_AUTH_HERO_URL?: string;
  /** Полный URL страницы OAuth callback на проде, если нужно переопределить origin */
  readonly VITE_AUTH_REDIRECT_URL?: string;
  /**
   * Базовый URL Cloudflare Worker helloword (без завершающего /).
   * В dev при отсутствии значения используется прокси Vite: `/api/helloword`.
   */
  readonly VITE_HELLOWORD_BASE_URL?: string;
  /**
   * Payment Link или Product Link из Stripe Dashboard (https://buy.stripe.com/...).
   * Кнопка «Оплатить» на /billing ведёт на этот URL. Секретные ключи сюда не кладут.
   */
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
