import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Telegraf } from "telegraf";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env.local"), override: true });
dotenv.config({ path: path.join(packageRoot, ".env"), override: true });

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error(
    "TELEGRAM_BOT_TOKEN не задан. Добавьте в корневой .env или в telegram-ok-bot/.env (см. telegram-ok-bot/.env.example).",
  );
  process.exit(1);
}

function hellwordBase(): string {
  const raw =
    process.env.VITE_HELLOWORD_BASE_URL?.trim() ||
    process.env.HELLOWORD_BASE_URL?.trim() ||
    "";
  if (!raw) {
    console.error(
      "Задайте HELLOWORD_BASE_URL или VITE_HELLOWORD_BASE_URL (URL воркера helloword без слэша в конце).",
    );
    process.exit(1);
  }
  return raw.replace(/\/+$/, "");
}

const ingestSecretRaw = process.env.TELEGRAM_BOT_INGEST_SECRET?.trim();
if (!ingestSecretRaw) {
  console.error(
    "TELEGRAM_BOT_INGEST_SECRET не задан — тот же секрет, что wrangler secret put TELEGRAM_BOT_INGEST_SECRET на helloword.",
  );
  process.exit(1);
}
const BOT_INGEST_SECRET = ingestSecretRaw;

const bot = new Telegraf(token);

type TasksIngestSuccess = { ok: true; count?: number; titles?: string[] };
type TasksIngestFail = {
  ok: false;
  error?: string;
  code?: string;
};

async function ingestTasks(
  telegramUserId: number,
  text: string,
): Promise<TasksIngestSuccess | TasksIngestFail> {
  const url = `${hellwordBase()}/telegram/tasks-ingest`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Secret": BOT_INGEST_SECRET,
    },
    body: JSON.stringify({ telegram_user_id: telegramUserId, text }),
  });
  let data: TasksIngestSuccess | TasksIngestFail;
  try {
    data = (await res.json()) as TasksIngestSuccess | TasksIngestFail;
  } catch {
    return { ok: false, error: `Ответ не JSON (HTTP ${res.status})` };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: `Пустой ответ (HTTP ${res.status})` };
  }
  if (!data.ok) {
    return data;
  }
  return data;
}

bot.on("message", async (ctx) => {
  if (ctx.chat?.type !== "private") {
    await ctx.reply("Работаю только в личных сообщениях (ЛС с ботом).");
    return;
  }

  const msg = ctx.message;
  if (!msg || !("text" in msg) || typeof msg.text !== "string") {
    await ctx.reply(
      "Пришлите текст задачи — я разобью её на шаги и сохраню на доску (нужна привязка в приложении → Настройки).",
    );
    return;
  }

  const text = msg.text.trim();
  if (!text) {
    await ctx.reply("Пустое сообщение. Опишите задачу текстом.");
    return;
  }

  const telegramUserId = ctx.from?.id;
  if (telegramUserId == null || !Number.isFinite(telegramUserId)) {
    await ctx.reply("Не удалось определить ваш Telegram ID.");
    return;
  }

  await ctx.reply("Думаю и сохраняю на доску…");

  try {
    const data = await ingestTasks(telegramUserId, text);
    if (!data.ok) {
      const errMsg = typeof data.error === "string" ? data.error : "Ошибка воркера";
      await ctx.reply(
        data.code === "not_linked" ? `${errMsg}` : `Не получилось: ${errMsg}`,
      );
      return;
    }

    const n = typeof data.count === "number" ? data.count : 0;
    const titles = Array.isArray(data.titles) ? data.titles : [];
    const lines = titles.length > 0 ? titles.map((t, i) => `${i + 1}. ${t}`).join("\n") : "";
    await ctx.reply(
      `Готово. Добавлено задач: ${n}${lines ? `\n\n${lines}` : ""}`,
    );
  } catch (e) {
    const msgErr = e instanceof Error ? e.message : String(e);
    await ctx.reply(`Сеть или сервер недоступен: ${msgErr}`);
  }
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
