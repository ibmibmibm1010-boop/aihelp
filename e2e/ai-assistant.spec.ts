import { describeAuthSuite as describeAuth, expect, test } from "./use-authed";

describeAuth("ИИ-помощник (сессия)", () => {
  test("FAB открывает панель; при настроенном воркере — вкладки Диалог / План", async ({
    page,
  }) => {
    await page.goto("/boards");
    await expect(page.locator("#boards-list-heading")).toBeVisible();

    await page.getByRole("button", { name: "ИИ-помощник" }).click();

    const dialog = page.getByRole("dialog", { name: "ИИ-помощник" });
    await expect(dialog).toBeVisible();

    const planTab = page.getByRole("button", { name: "План", exact: true });
    if (await planTab.isVisible()) {
      await planTab.click();
      await expect(
        page.getByRole("button", { name: "Разбить на шаги", exact: true }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Диалог", exact: true }).click();
      await expect(
        page.getByText("Спросите о планировании, формулировке задач или приоритетах.", {
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/VITE_HELLOWORD|helloword|прокси/i),
      ).toBeVisible();
    }

    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
    await expect(dialog).toBeHidden();
  });
});
