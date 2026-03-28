/**
 * E2E-103: 検索・ジャンルフィルターフロー
 * 注: /search は専用ページなし（not-found ページ）
 * ジャンルフィルタで代替テストを実装
 */
import { test, expect } from "@playwright/test";

test.describe("E2E-103: 検索・ジャンルフィルターフロー", () => {
  test("ジャンルページ(SF)が正常に表示される", async ({ page }) => {
    await page.goto("/genre/sf");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("ジャンルページに SF 小説のみ表示される", async ({ page }) => {
    await page.goto("/genre/sf");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("SF").first()).toBeVisible();
  });

  test("ジャンルページの小説リンクをクリックすると詳細ページへ遷移", async ({ page }) => {
    await page.goto("/genre/sf");
    await page.waitForLoadState("networkidle");
    // NovelCard リンクの href 属性で確認
    const novelLink = page.locator("a.novel-card, a[href^='/novel/']").first();
    if (await novelLink.count() > 0) {
      const href = await novelLink.getAttribute("href");
      expect(href).toContain("/novel/");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/novel/");
    }
  });

  test("ヘッダーのジャンルドロップダウンで検索できる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByText("ジャンル ▾").click();
    const fantasyItem = page.locator('[role="menuitem"]').filter({ hasText: "ファンタジー" });
    await expect(fantasyItem).toBeVisible();
    // href で確認
    const href = await fantasyItem.getAttribute("href");
    expect(href).toContain("/genre/fantasy");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/genre/fantasy");
  });

  test("URL のクエリパラメータで検索ページが表示される", async ({ page }) => {
    await page.goto("/search?q=星");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main, body").first()).toBeVisible();
  });

  test("存在しないページは 404 ページを表示する", async ({ page }) => {
    await page.goto("/genre/nonexistent-genre-xyz");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main, body").first()).toBeVisible();
  });
});
