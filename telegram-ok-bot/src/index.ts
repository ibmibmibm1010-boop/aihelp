import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Telegraf } from "telegraf";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(packageRoot, ".env") });

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error(
    "TELEGRAM_BOT_TOKEN is not set. Copy telegram-ok-bot/.env.example to telegram-ok-bot/.env",
  );
  process.exit(1);
}

const bot = new Telegraf(token);

bot.on("message", async (ctx) => {
  await ctx.reply("ok");
});

bot.catch((err) => {
  console.error("telegram-ok-bot error:", err);
});

void bot.launch().then(() => {
  console.log("telegram-ok-bot: polling…");
});

process.once("SIGINT", () => {
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  bot.stop("SIGTERM");
});
