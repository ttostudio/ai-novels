import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface CharacterBible {
  novelSlug: string;
  novelTitle: string;
  characters: {
    name: string;
    aliases: string[];
    personality: string;
    speechPattern: string;
    relationships: { name: string; relation: string }[];
    backstory: string;
    traits: string[];
  }[];
}

interface PlotOutline {
  novelSlug: string;
  title: string;
  overallArc: string;
  chapters: {
    number: number;
    summary: string;
    keyEvents: string[];
    foreshadowing: string[];
  }[];
  unresolvedPlots: string[];
  timeline: string[];
}

interface Chapter {
  id: string;
  novelSlug: string;
  number: number;
  title: string;
  content: string;
  publishedAt: string;
}

export interface ValidationResult {
  novelSlug: string;
  chapterNumber: number;
  nameInconsistencies: string[];
  plotInconsistencies: string[];
  qualityScore: QualityScore;
  passed: boolean;
}

export interface QualityScore {
  totalScore: number;
  charCount: number;
  charCountScore: number;
  dialogueRatio: number;
  dialogueScore: number;
  paragraphCount: number;
  paragraphScore: number;
}

function loadCharacterBible(novelSlug: string): CharacterBible | null {
  const biblePath = path.resolve(
    __dirname,
    `../frontend/data/character-bibles/${novelSlug}.json`
  );
  if (!fs.existsSync(biblePath)) return null;
  return JSON.parse(fs.readFileSync(biblePath, 'utf-8'));
}

function loadPlotOutline(novelSlug: string): PlotOutline | null {
  const outlinePath = path.resolve(
    __dirname,
    `../frontend/data/plot-outlines/${novelSlug}.json`
  );
  if (!fs.existsSync(outlinePath)) return null;
  return JSON.parse(fs.readFileSync(outlinePath, 'utf-8'));
}

/**
 * キャラ名の表記ゆれ検出
 * character-bible の name/aliases と照合し、本文中で一致しない表記がないか確認する
 */
function detectNameInconsistencies(content: string, bible: CharacterBible): string[] {
  const issues: string[] = [];

  for (const character of bible.characters) {
    const allNames = [character.name, ...character.aliases];
    const primaryName = character.name;

    // すべての別名が登場しているか確認（別名のみで正式名が0回なら警告）
    const primaryCount = countOccurrences(content, primaryName);
    const aliasUsage: { alias: string; count: number }[] = [];

    for (const alias of character.aliases) {
      const count = countOccurrences(content, alias);
      if (count > 0) {
        aliasUsage.push({ alias, count });
      }
    }

    // 正式名が1回も使われず別名だけが使われている場合を記録
    if (primaryCount === 0 && aliasUsage.length > 0) {
      const aliasInfo = aliasUsage.map((a) => `「${a.alias}」×${a.count}`).join(', ');
      issues.push(
        `キャラ「${primaryName}」の正式名が未使用。別名のみ検出: ${aliasInfo}`
      );
    }

    // character-bibleに登録されていない類似表記を検出（簡易チェック）
    // 正式名の最初の1文字だけで呼んでいる可能性（漢字1文字など）
    if (primaryName.length > 1) {
      const firstChar = primaryName[0];
      const surroundCheck = new RegExp(`[^ア-ン一-龯]${firstChar}[^ア-ン一-龯]`, 'g');
      if (
        surroundCheck.test(content) &&
        !allNames.some((n) => n === firstChar)
      ) {
        // 一文字表記がbibleに登録されていない場合のみ（誤検知を避けるため厳しくしない）
        // ここでは情報として記録するにとどめる
      }
    }
  }

  return issues;
}

/**
 * 前章との矛盾チェック
 * キャラの状態・場所・時間帯について前章の末尾と現章を比較する
 */
function detectPlotInconsistencies(
  currentChapter: Chapter,
  previousChapter: Chapter | null,
  outline: PlotOutline | null
): string[] {
  const issues: string[] = [];

  // アウトラインとの照合
  if (outline) {
    const chapterOutline = outline.chapters.find(
      (c) => c.number === currentChapter.number
    );
    if (chapterOutline && chapterOutline.keyEvents.length > 0) {
      // keyEventsのうちいくつが本文に反映されているかをチェック（ゆるい照合）
      const coveredEvents = chapterOutline.keyEvents.filter((event) => {
        const keywords = event.replace(/[「」、。]/g, ' ').split(/[\s　]+/).filter((w) => w.length > 1);
        return keywords.some((kw) => currentChapter.content.includes(kw));
      });
      if (coveredEvents.length < Math.ceil(chapterOutline.keyEvents.length / 2)) {
        issues.push(
          `アウトラインのキーイベントが半数以上欠けています。` +
          `期待: ${chapterOutline.keyEvents.join(' / ')}`
        );
      }
    }
  }

  // 前章との時系列整合性（簡易：前章が「夜」で現章が「朝」でなければ不自然でない）
  if (previousChapter) {
    const prevContent = previousChapter.content;
    const currContent = currentChapter.content;

    const prevEndsWith = prevContent.slice(-500);
    const currStartsWith = currContent.slice(0, 500);

    // 前章末尾が「死んだ」「消えた」のに現章で普通に登場しているキャラを検出（簡易）
    const deathKeywords = ['死んだ', '亡くなった', '消えた', '息絶えた'];
    for (const keyword of deathKeywords) {
      if (prevEndsWith.includes(keyword)) {
        issues.push(
          `前章末尾に「${keyword}」という記述があります。現章での登場に注意してください。`
        );
        break;
      }
    }

    // 前章が「夜」で終わっているのに現章も「夜」で始まる場合はOK
    // 前章が「朝」で終わっているのに現章が「昨夜」と書いていたら矛盾の可能性
    const prevHasMorning = /朝|早朝|夜明け/.test(prevEndsWith);
    const currHasLastNight = /昨夜|昨晩/.test(currStartsWith);
    if (prevHasMorning && currHasLastNight) {
      issues.push('前章が朝で終わっているのに現章冒頭に「昨夜/昨晩」の記述があります。時系列を確認してください。');
    }
  }

  return issues;
}

/**
 * 品質スコア計算
 */
function calcQualityScore(content: string): QualityScore {
  const charCount = content.length;

  // 文字数スコア（3000〜5000文字が満点）
  let charCountScore: number;
  if (charCount >= 3000 && charCount <= 5000) {
    charCountScore = 100;
  } else if (charCount < 3000) {
    charCountScore = Math.round((charCount / 3000) * 100);
  } else {
    charCountScore = Math.max(0, 100 - Math.round(((charCount - 5000) / 2000) * 50));
  }

  // 会話比率（「」内の文字数 / 全体）
  const dialogueMatches = content.match(/「[^」]*」/g) ?? [];
  const dialogueChars = dialogueMatches.reduce((sum, m) => sum + m.length, 0);
  const dialogueRatio = charCount > 0 ? dialogueChars / charCount : 0;
  // 20〜50%が理想
  let dialogueScore: number;
  if (dialogueRatio >= 0.2 && dialogueRatio <= 0.5) {
    dialogueScore = 100;
  } else if (dialogueRatio < 0.2) {
    dialogueScore = Math.round((dialogueRatio / 0.2) * 100);
  } else {
    dialogueScore = Math.max(0, 100 - Math.round(((dialogueRatio - 0.5) / 0.3) * 100));
  }

  // 段落数スコア（空行で分割した段落）
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  // 10〜30段落が理想
  let paragraphScore: number;
  if (paragraphCount >= 10 && paragraphCount <= 30) {
    paragraphScore = 100;
  } else if (paragraphCount < 10) {
    paragraphScore = Math.round((paragraphCount / 10) * 100);
  } else {
    paragraphScore = Math.max(0, 100 - Math.round(((paragraphCount - 30) / 20) * 50));
  }

  const totalScore = Math.round((charCountScore + dialogueScore + paragraphScore) / 3);

  return {
    totalScore,
    charCount,
    charCountScore,
    dialogueRatio: Math.round(dialogueRatio * 1000) / 10,
    dialogueScore,
    paragraphCount,
    paragraphScore,
  };
}

function countOccurrences(text: string, word: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(word, pos)) !== -1) {
    count++;
    pos += word.length;
  }
  return count;
}

export function validateChapter(
  novelSlug: string,
  currentChapter: Chapter,
  previousChapter: Chapter | null = null
): ValidationResult {
  const bible = loadCharacterBible(novelSlug);
  const outline = loadPlotOutline(novelSlug);

  const nameInconsistencies = bible
    ? detectNameInconsistencies(currentChapter.content, bible)
    : [];

  const plotInconsistencies = detectPlotInconsistencies(
    currentChapter,
    previousChapter,
    outline
  );

  const qualityScore = calcQualityScore(currentChapter.content);

  const passed =
    nameInconsistencies.length === 0 &&
    plotInconsistencies.length === 0 &&
    qualityScore.totalScore >= 60;

  return {
    novelSlug,
    chapterNumber: currentChapter.number,
    nameInconsistencies,
    plotInconsistencies,
    qualityScore,
    passed,
  };
}

function printResult(result: ValidationResult): void {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} — ${result.novelSlug} 第${result.chapterNumber}話`);
  console.log(`品質スコア: ${result.qualityScore.totalScore}/100`);
  console.log(
    `  文字数: ${result.qualityScore.charCount}文字 (スコア: ${result.qualityScore.charCountScore})`
  );
  console.log(
    `  会話比率: ${result.qualityScore.dialogueRatio}% (スコア: ${result.qualityScore.dialogueScore})`
  );
  console.log(
    `  段落数: ${result.qualityScore.paragraphCount} (スコア: ${result.qualityScore.paragraphScore})`
  );

  if (result.nameInconsistencies.length > 0) {
    console.log('\n⚠ キャラ名の表記ゆれ:');
    result.nameInconsistencies.forEach((i) => console.log(`  - ${i}`));
  }

  if (result.plotInconsistencies.length > 0) {
    console.log('\n⚠ プロット整合性:');
    result.plotInconsistencies.forEach((i) => console.log(`  - ${i}`));
  }
}

// CLI として実行した場合
const isMain =
  typeof import.meta !== 'undefined' && import.meta.url
    ? fileURLToPath(import.meta.url) === process.argv[1]
    : require.main === module;

if (isMain) {
  const args = process.argv.slice(2);
  const novelSlug = args[0];
  const chapterNumber = args[1] ? parseInt(args[1], 10) : undefined;

  if (!novelSlug) {
    console.error('Usage: tsx scripts/validate-chapter.ts <novel-slug> [chapter-number]');
    process.exit(1);
  }

  const chaptersPath = path.resolve(
    __dirname,
    `../frontend/data/chapters/${novelSlug}.json`
  );

  if (!fs.existsSync(chaptersPath)) {
    console.error(`Chapters file not found: ${chaptersPath}`);
    process.exit(1);
  }

  const chapters: Chapter[] = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));

  if (chapters.length === 0) {
    console.error('No chapters found.');
    process.exit(1);
  }

  const targetChapters = chapterNumber
    ? chapters.filter((c) => c.number === chapterNumber)
    : chapters;

  if (targetChapters.length === 0) {
    console.error(`Chapter ${chapterNumber} not found.`);
    process.exit(1);
  }

  let allPassed = true;
  for (const chapter of targetChapters) {
    const prevChapter =
      chapters.find((c) => c.number === chapter.number - 1) ?? null;
    const result = validateChapter(novelSlug, chapter, prevChapter);
    printResult(result);
    if (!result.passed) allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}
