# Настройка Telegram → задачи

1. Примените SQL: `npm run db:apply-telegram-user-links` или `supabase/create_telegram_user_links.sql` в SQL Editor.
2. Воркер **helloword**: `wrangler secret put TELEGRAM_BOT_INGEST_SECRET` — длинная случайная строка.
3. В `.env` (корень) и те же переменные у **telegram-ok-bot**: `TELEGRAM_BOT_INGEST_SECRET`, `VITE_HELLOWORD_BASE_URL`/`HELLOWORD_BASE_URL`, `TELEGRAM_BOT_TOKEN`.
4. Приложение: **Настройки** → блок Telegram → Telegram user id + доска → сохранить.
5. Запуск бота: из корня `npm run telegram:ok`.

Эндпоинты helloword: `POST /telegram/link-account` (Bearer = JWT Supabase), `POST /telegram/tasks-ingest` (заголовок `X-Telegram-Bot-Secret`).
