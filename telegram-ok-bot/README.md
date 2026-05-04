# telegram-ok-bot

Бот на long polling отвечает **ok** на каждое входящее сообщение.

1. Откройте [@BotFather](https://t.me/BotFather), команда `/newbot`, сохраните **токен**.
2. Токен в **`TELEGRAM_BOT_TOKEN=`**: в **`telegram-ok-bot/.env`** (копия из `.env.example`) **или** в **корневом** `.env` / `.env.local` монорепо (удобно один файл). Либо экспортируйте переменную в окружении без `.env`.
3. Из этого каталога: `npm install` → `npm run build` → `npm start`. Либо из корня монорепо: `npm run telegram:ok` (соберёт workspace при необходимости — см. корневой `package.json`).

В **личке** бот получает каждое сообщение. В **группах** по умолчанию он не видит все реплики: в BotFather → Bot Settings → Group Privacy → **Turn off**, либо упоминайте бота или используйте команды.
