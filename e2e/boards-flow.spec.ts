import { expect, test, type Page } from "./use-authed";

const prefix = process.env.E2E_BOARD_NAME_PREFIX ?? "E2E";

/** Установите `E2E_SKIP_BOARD_E2E=1`, если в Supabase нет таблицы / политик для досок — остальные e2e продолжат проходить. */
const skipMutations = process.env.E2E_SKIP_BOARD_E2E === "1";

test.describe.configure({ mode: "serial" });

async function expectCreateBoardDialogClosed(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Новая доска" });
  try {
    await expect(dialog).toBeHidden({ timeout: 45_000 });
  } catch {
    const errText = await page
      .getByRole("dialog", { name: "Новая доска" })
      .getByRole("alert")
      .textContent()
      .catch(() => null);
    throw new Error(
      errText
        ? `createBoard: ${errText.trim()}`
        : "Диалог «Новая доска» не закрылся (проверьте RLS и миграции boards).",
    );
  }
}

const boardsSuite = skipMutations ? test.describe.skip : test.describe;

boardsSuite("Доски и задачи (последовательно)", () => {
  test("список: создать, увидеть, удалить", async ({ page }) => {
    const name = `${prefix} ${Date.now()}`;

    await page.goto("/boards");
    await page.getByRole("button", { name: "Добавить доску" }).click();
    await expect(page.getByRole("dialog", { name: "Новая доска" })).toBeVisible();
    await page.locator("#board-name").fill(name);
    await page.getByRole("dialog", { name: "Новая доска" }).getByRole("button", { name: "Создать" }).click();
    await expectCreateBoardDialogClosed(page);
    await page.reload();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 25_000 });

    const row = page.getByRole("listitem").filter({ hasText: name });
    await row.getByRole("button", { name: "Удалить доску" }).click();
    await expect(page.getByRole("dialog", { name: "Удалить доску?" })).toBeVisible();
    await page.getByRole("button", { name: "Удалить" }).click();
    await expect(page.getByRole("dialog", { name: "Удалить доску?" })).toBeHidden({ timeout: 20_000 });

    await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 15_000 });
  });

  test("деталь: доска, + Задача, карточка, уборка", async ({ page }) => {
    const boardName = `${prefix} task ${Date.now()}`;
    const taskTitle = `T ${Date.now()}`;

    await page.goto("/boards");
    await page.getByRole("button", { name: "Добавить доску" }).click();
    await page.locator("#board-name").fill(boardName);
    await page.getByRole("dialog", { name: "Новая доска" }).getByRole("button", { name: "Создать" }).click();
    await expectCreateBoardDialogClosed(page);
    await page.reload();
    await expect(page.getByText(boardName, { exact: true })).toBeVisible({ timeout: 25_000 });

    await page.getByRole("list", { name: "Список досок" }).getByRole("link", { name: boardName }).click();
    await expect(page).toHaveURL(/\/boards\/[0-9a-f-]+$/i, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "+ Задача" }).first()).toBeVisible();

    await page.getByRole("button", { name: "+ Задача" }).first().click();
    await expect(page.getByRole("dialog", { name: "Новая задача" })).toBeVisible();
    await page.getByPlaceholder("Заголовок").fill(taskTitle);
    await page.getByRole("dialog", { name: "Новая задача" }).getByRole("button", { name: "Создать" }).click();
    await expect(page.getByRole("dialog", { name: "Новая задача" })).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/boards");
    const row = page.getByRole("listitem").filter({ hasText: boardName });
    await row.getByRole("button", { name: "Удалить доску" }).click();
    await page.getByRole("button", { name: "Удалить" }).click();
    await expect(page.getByText(boardName, { exact: true })).toHaveCount(0, { timeout: 15_000 });
  });
});
