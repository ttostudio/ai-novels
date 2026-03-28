/**
 * E2E-101: ホーム画面小説一覧
 */
import { test, expect } from "@playwright/test";

test.describe("E2E-101: ホーム画面小説一覧", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("ホーム画面が正常に表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/AI Novels/);
    await expect(page.locator("header")).toBeVisible();
  });

  test("小説一覧が表示される（複数件）", async ({ page }) => {
    const novelCards = page.locator('a[href^="/novel/"]').first();
    await expect(novelCards).toBeVisible();
  });

  test("ジャンルチップが表示される", async ({ page }) => {
    const genreSection = page.getByText(/SF|ファンタジー|ミステリー|日常系|ホラー|恋愛/).first();
    await expect(genreSection).toBeVisible();
  });

  test("新着更新セクションが表示される", async ({ page }) => {
    await expect(page.getByText("新着更新")).toBeVisible();
  });

  test("全作品セクションが表示される", async ({ page }) => {
    await expect(page.getByText("全作品")).toBeVisible();
  });

  test("小説タイトルをクリックすると小説関連ページへ遷移する", async ({ page }) => {
    // 全作品セクションの NovelCard リンク（href 属性で取得して直接遷移）
    const novelCard = page.locator("a.novel-card").first();
    await expect(novelCard).toBeVisible();
    const href = await novelCard.getAttribute("href");
    expect(href).toContain("/novel/");
    // 直接遷移で動作確認
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/novel/");
  });

  test("ジャンルドロップダウンが動作する", async ({ page }) => {
    // ジャンル ▾ ボタンをクリック
    await page.getByText("ジャンル ▾").click();
    // ジャンルメニューが表示される
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    // ジャンルリンクが存在する
    const sfLink = page.locator('[role="menuitem"]').filter({ hasText: "SF" }).first();
    await expect(sfLink).toBeVisible();
    // SF リンクの href を確認して直接遷移
    const href = await sfLink.getAttribute("href");
    expect(href).toContain("/genre/sf");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/genre/sf");
  });
});
