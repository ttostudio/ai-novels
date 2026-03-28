/**
 * E2E-104: ブックマーク操作フロー
 */
import { test, expect } from "@playwright/test";

test.describe("E2E-104: ブックマークフロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("ブックマークページが表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.waitForLoadState("networkidle");
    // h1 タイトルが表示される（strict mode 回避: h1 限定）
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("h1").first()).toContainText("ブックマーク");
  });

  test("ブックマークが空の場合、適切なメッセージが表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("ブックマークがまだありません")).toBeVisible();
    await expect(page.getByText("作品を探す")).toBeVisible();
  });

  test("localStorage にブックマークを追加するとページに表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.evaluate(() => {
      localStorage.setItem(
        "ai-novels-bookmarks",
        JSON.stringify([
          {
            novelSlug: "stellar-drift",
            chapterNumber: 3,
            updatedAt: new Date().toISOString(),
          },
        ])
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("ブックマークがまだありません")).not.toBeVisible();
    await expect(page.getByText("星間漂流")).toBeVisible();
  });

  test("ブックマークの「続きを読む」リンクが正しいURLへ遷移", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.evaluate(() => {
      localStorage.setItem(
        "ai-novels-bookmarks",
        JSON.stringify([
          {
            novelSlug: "stellar-drift",
            chapterNumber: 2,
            updatedAt: new Date().toISOString(),
          },
        ])
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const continueLink = page.getByText("続きを読む").first();
    await expect(continueLink).toBeVisible();
    const href = await continueLink.evaluate(
      (el) => (el as HTMLAnchorElement).href ?? (el.closest("a") as HTMLAnchorElement)?.href
    );
    expect(href).toContain("/novel/stellar-drift/2");
  });

  test("ブックマーク削除ボタンでブックマークが削除される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.evaluate(() => {
      localStorage.setItem(
        "ai-novels-bookmarks",
        JSON.stringify([
          {
            novelSlug: "stellar-drift",
            chapterNumber: 1,
            updatedAt: new Date().toISOString(),
          },
        ])
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const deleteBtn = page.getByRole("button", { name: /削除|ブックマークを削除/ }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText("ブックマークがまだありません")).toBeVisible();
  });

  test("複数ブックマークが全件表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.evaluate(() => {
      localStorage.setItem(
        "ai-novels-bookmarks",
        JSON.stringify([
          { novelSlug: "stellar-drift", chapterNumber: 1, updatedAt: new Date().toISOString() },
          { novelSlug: "magic-academy", chapterNumber: 2, updatedAt: new Date().toISOString() },
        ])
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("2件")).toBeVisible();
  });
});
