"use client";

import { useState } from "react";
import type { Novel, Chapter } from "@/lib/types";
import ReaderHeader from "@/components/reader/ReaderHeader";
import ChapterContent from "@/components/reader/ChapterContent";
import ChapterNavigation from "@/components/reader/ChapterNavigation";
import ReaderSettingsPanel from "@/components/reader/ReaderSettings";
import ReadingProgressBar from "@/components/reader/ReadingProgressBar";
import TableOfContents from "@/components/reader/TableOfContents";
import ShareButtons from "@/components/reader/ShareButtons";
import { useBookmark } from "@/lib/hooks/useBookmark";
import { useReaderSettings } from "@/lib/hooks/useReaderSettings";

interface Props {
  novel: Novel;
  chapter: Chapter;
  chapters: Chapter[];
  prevChapter: Chapter | null;
  nextChapter: Chapter | null;
}

export default function ChapterPageClient({ novel, chapter, chapters, prevChapter, nextChapter }: Props) {
  const { isBookmarked, toggleBookmark } = useBookmark();
  const { settings, updateSettings, fontSizeClass, bgStyle, lineHeightClass } = useReaderSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  const bookmarked = isBookmarked(novel.slug);

  return (
    <div className="min-h-screen reader-content" style={bgStyle}>
      <ReadingProgressBar />

      <ReaderHeader
        novelSlug={novel.slug}
        novelTitle={novel.title}
        chapterNumber={chapter.number}
        chapterTitle={chapter.title}
        isBookmarked={bookmarked}
        onToggleBookmark={() => toggleBookmark(novel.slug, chapter.number)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenToc={() => setTocOpen(true)}
      />

      <div
        className="mx-auto px-4 py-12"
        style={{ maxWidth: "var(--max-width-reader)" }}
      >
        <ChapterContent
          content={chapter.content}
          fontSizeClass={fontSizeClass}
          lineHeightClass={lineHeightClass}
        />

        <div className="flex justify-center py-4">
          <ShareButtons title={novel.title} chapterTitle={chapter.title} />
        </div>

        <ChapterNavigation
          novelSlug={novel.slug}
          currentChapter={chapter.number}
          totalChapters={novel.totalChapters}
          prevTitle={prevChapter?.title}
          nextTitle={nextChapter?.title}
        />
      </div>

      {settingsOpen && (
        <ReaderSettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <TableOfContents
        novelSlug={novel.slug}
        novelTitle={novel.title}
        chapters={chapters}
        currentChapter={chapter.number}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
      />
    </div>
  );
}
