interface ErrorBannerProps {
  message?: string;
}

export function ErrorBanner({
  message = "データの読み込みに失敗しました。しばらく後にもう一度お試しください。",
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-lg px-4 py-3 text-sm"
      style={{
        backgroundColor: "color-mix(in srgb, #ef4444 15%, var(--panel))",
        border: "1px solid #ef4444",
        color: "var(--text)",
      }}
    >
      ⚠️ {message}
    </div>
  );
}
