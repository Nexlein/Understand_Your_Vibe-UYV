import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Code Tribunal",
  description: "Every AI-generated PR deserves a fair trial.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header
          style={{
            background: "#1a1a2e",
            borderBottom: "1px solid #2d2d4a",
            padding: "0 2rem",
            height: "52px",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              color: "#b5922c",
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontWeight: 700,
              fontSize: "1.125rem",
              letterSpacing: "0.02em",
            }}
          >
            ⚖️ Code Tribunal
          </a>
          <nav style={{ marginLeft: "auto", display: "flex", gap: "1.5rem" }}>
            <a
              href="/dashboard"
              style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.875rem" }}
            >
              Dashboard
            </a>
          </nav>
        </header>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      </body>
    </html>
  );
}
