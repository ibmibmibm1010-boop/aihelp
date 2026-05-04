# telegram-ok-bot

Long polling + отправка текстов задач во воркер **helloword** (`/telegram/tasks-ingest`): текст разбивается LLM и сохраняется в Supabase (см. [docs/settings/telegram-bot.md](../docs/settings/telegram-bot.md)).

1. [@BotFather](https://t.me/BotFather) → `/newbot` → **`TELEGRAM_BOT_TOKEN`**.
2. Общий с воркером секрет **`TELEGRAM_BOT_INGEST_SECRET`** (`wrangler secret put TELEGRAM_BOT_INGEST_SECRET` из каталога `aibddck/helloword`).
3. **`HELLOWORD_BASE_URL`** или **`VITE_HELLOWORD_BASE_URL`** (= URL helloword без `/` на конце), можно в корневом `.env`.
4. Запуск из корня: `npm run telegram:ok`.

Работа — **только в личном чате** с ботом; нужна привязка аккаунта в приложении (**Настройки**).
