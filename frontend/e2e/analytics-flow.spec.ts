import { test, expect } from "@playwright/test";

// テスト対象小説（実データに合わせる）
const NOVEL_SLUG = "stellar-drift";
const CHAPTER_1_URL = `/novel/${NOVEL_SLUG}/1`;
const CHAPTER_2_URL = `/novel/${NOVEL_SLUG}/2`;
const ANALYTICS_URL = "/analytics";

// PV ストレージキー
const PV_KEY = "ai-novels:pv";

test.describe("E2E-01 / E2E-02: 章ページ訪問で PV が記録され、ダッシュボードに表示される", () => {
  test.beforeEach(async ({ page }) => {
    // localStorage をクリア
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("E2E-01: 章ページ訪問で PV が localStorage に記録される", async ({ page }) => {
    await page.goto(CHAPTER_1_URL);
    await page.waitForLoadState("networkidle");

    const pv = await page.evaluate((key) => localStorage.getItem(key), PV_KEY);
    expect(pv).not.toBeNull();

    const pvData = JSON.parse(pv!);
    expect(pvData[NOVEL_SLUG]).toBeDefined();
    expect(pvData[NOVEL_SLUG]["1"].views).toBe(1);
  });

  test("E2E-02: ダッシュボードで訪問した小説の PV が表示される", async ({ page }) => {
    // 章ページ訪問（PV 記録）
    await page.goto(CHAPTER_1_URL);
    await page.waitForLoadState("networkidle");

    // ダッシュボードへ移動
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState("networkidle");

    // 「まだデータがありません」は表示されない
    await expect(page.getByText("まだデータがありません")).not.toBeVisible();

    // 総PV が表示されている
    await expect(page.getByText("総PV")).toBeVisible();
    // PV = 1
    const pvCard = page.locator('[aria-label*="総ページビュー数"]');
    await expect(pvCard).toBeVisible();
  });
});

test.describe("E2E-03: 同章を複数回訪問するとカウントが増加する", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("3 回訪問で PV = 3 になる", async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto(CHAPTER_1_URL);
      await page.waitForLoadState("networkidle");
    }

    const pv = await page.evaluate((key) => localStorage.getItem(key), PV_KEY);
    const pvData = JSON.parse(pv!);
    expect(pvData[NOVEL_SLUG]["1"].views).toBe(3);

    // ダッシュボードで確認
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState("networkidle");
    // 総PV カード（aria-label で特定）に "3" が表示される
    await expect(page.locator('[aria-label*="総ページビュー数: 3"]')).toBeVisible();
  });
});

test.describe("E2E-04: スクロールで読了率が更新される", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("ページ末尾までスクロールすると読了率が保存される", async ({ page }) => {
    await page.goto(CHAPTER_1_URL);
    await page.waitForLoadState("networkidle");

    // ページ末尾までスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000); // デバウンス待機

    // 読了率が localStorage に保存される
    const progress = await page.evaluate(() =>
      localStorage.getItem("ai-novels:reading-progress")
    );
    expect(progress).not.toBeNull();

    const progressData = JSON.parse(progress!);
    const chapterProgress = progressData[NOVEL_SLUG]?.["1"];
    expect(chapterProgress).toBeDefined();
    expect(chapterProgress.readPercent).toBeGreaterThan(0);
  });
});

test.describe("E2E-05: 次章プレビュータイトルが ChapterNavigation に表示される", () => {
  test("第1話ページに第2話のタイトルが表示される", async ({ page }) => {
    await page.goto(CHAPTER_1_URL);
    await page.waitForLoadState("networkidle");

    // 章ナビゲーション領域
    const nav = page.getByRole("navigation", { name: "章ナビゲーション" });
    await expect(nav).toBeVisible();

    // 次章リンクが存在する（第2話）
    const nextLink = nav.getByRole("link").filter({ hasText: /第2話/ });
    await expect(nextLink).toBeVisible();

    // タイトルプレビューが含まれる（「星の海へ」）
    await expect(nextLink).toContainText("星の海へ");
  });
});

test.describe("E2E-06: 複数小説のダッシュボード集計", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("小説Aを2回・小説Bを1回訪問した場合の集計が正しい", async ({ page }) => {
    // stellar-drift ch1 を 2 回
    await page.goto(`/novel/stellar-drift/1`);
    await page.waitForLoadState("networkidle");
    await page.goto(`/novel/stellar-drift/1`);
    await page.waitForLoadState("networkidle");
    // magic-academy ch1 を 1 回
    await page.goto(`/novel/magic-academy/1`);
    await page.waitForLoadState("networkidle");

    const pv = await page.evaluate((key) => localStorage.getItem(key), PV_KEY);
    const pvData = JSON.parse(pv!);

    expect(pvData["stellar-drift"]["1"].views).toBe(2);
    expect(pvData["magic-academy"]["1"].views).toBe(1);

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState("networkidle");

    // 総PV = 3
    await expect(page.locator('[aria-label*="総ページビュー数: 3"]')).toBeVisible();
  });
});

test.describe("E2E-07: localStorage が空の状態でダッシュボードがクラッシュしない", () => {
  test("localStorage クリア後にダッシュボードが正常表示される", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState("networkidle");

    // エラーなく「データなし」メッセージが表示される
    await expect(page.getByText("まだデータがありません")).toBeVisible();
    await expect(
      page.getByText("小説を読み始めると、ここに分析データが表示されます。")
    ).toBeVisible();
  });
});
