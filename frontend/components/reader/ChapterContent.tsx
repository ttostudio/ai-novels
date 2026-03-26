"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  fontSizeClass: string;
  lineHeightClass: string;
}

export default function ChapterContent({ content, fontSizeClass, lineHeightClass }: Props) {
  return (
    <div
      className={`font-reading reader-content prose max-w-none ${fontSizeClass} ${lineHeightClass}`}
      style={{ fontFamily: "var(--font-reading)" }}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-6 mt-0 text-center" style={{ color: "var(--text)", fontFamily: "var(--font-reading)" }}>
              {children}
            </h1>
          ),
          p: ({ children }) => (
            <p className="mb-4 indent-8" style={{ color: "inherit" }}>
              {children}
            </p>
          ),
          hr: () => (
            <div className="chapter-separator my-8">* * *</div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
