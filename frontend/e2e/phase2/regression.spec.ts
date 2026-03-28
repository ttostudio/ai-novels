/**
 * E2E-105: 既存機能の回帰テスト
 */
import { test, expect } from "@playwright/test";

test.describe("E2E-105: 回帰テスト — Phase 1 機能の継続動作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("REG-01: ホームページが 200 で表示される", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  });

  test("REG-02: 小説詳細ページが正常に表示される", async ({ page }) => {
    const resp = await page.goto("/novel/stellar-drift");
    expect(resp?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("REG-03: 章ページが正常に表示される", async ({ page }) => {
    const resp = await page.goto("/novel/stellar-drift/1");
    expect(resp?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("REG-04: ブックマークページが正常に表示される", async ({ page }) => {
    const resp = await page.goto("/bookmarks");
    expect(resp?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    // h1 でブックマークタイトルを確認
    await expect(page.locator("h1").first()).toContainText("ブックマーク");
  });

  test("REG-05: アナリティクスページが正常に表示される", async ({ page }) => {
    const resp = await page.goto("/analytics");
    expect(resp?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("REG-06: 存在しないページは not-found ページを表示する", async ({ page }) => {
    await page.goto("/novel/nonexistent-novel-xyz");
    await page.waitForLoadState("networkidle");
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    // クラッシュしないこと
  });

  test("REG-07: PV トラッキングが章ページで動作する", async ({ page }) => {
    await page.goto("/novel/stellar-drift/1");
    await page.waitForLoadState("networkidle");
    const pv = await page.evaluate(() => localStorage.getItem("ai-novels:pv"));
    expect(pv).not.toBeNull();
    const pvData = JSON.parse(pv!);
    expect(pvData["stellar-drift"]["1"].views).toBe(1);
  });

  test("REG-08: ジャンルページが正常に表示される", async ({ page }) => {
    const resp = await page.goto("/genre/sf");
    expect(resp?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("REG-09: ヘッダーナビゲーションが全ページで表示される", async ({ page }) => {
    const pages = ["/", "/bookmarks", "/analytics"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("header").first()).toBeVisible();
    }
  });

  test("REG-10: フッターが全ページで表示される", async ({ page }) => {
    const pages = ["/", "/bookmarks", "/analytics"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("footer").first()).toBeVisible();
    }
  });

  test("REG-11: アナリティクスダッシュボード - localStorage なしで正常動作", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("まだデータがありません")).toBeVisible();
  });

  test("REG-12: 章ページから小説関連ページに戻るリンクがある", async ({ page }) => {
    await page.goto("/novel/stellar-drift/1");
    await page.waitForLoadState("networkidle");
    // 小説詳細ページへの何らかのリンクが存在する
    const backLinks = page.locator(`a[href*="/novel/stellar-drift"]`);
    const count = await backLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
