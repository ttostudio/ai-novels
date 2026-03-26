import type { Metadata } from "next";
import BookmarksPageClient from "./BookmarksClient";

export const metadata: Metadata = {
  title: "ブックマーク",
};

export default function BookmarksPage() {
  return <BookmarksPageClient />;
}
