"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min(100, (scrollTop / docHeight) * 100));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-14 left-0 w-full z-50 h-[3px]"
      style={{ backgroundColor: "var(--border)" }}
    >
      <div
        className="h-full transition-[width] duration-100"
        style={{
          width: `${progress}%`,
          backgroundColor: "var(--accent)",
        }}
      />
    </div>
  );
}
