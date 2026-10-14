import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/Providers";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Ask anything about the Seven Towers project.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Runs before paint so theme matches localStorage / system with no flash. */
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme-preference");
    var mode = stored || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
