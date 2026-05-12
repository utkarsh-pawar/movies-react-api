import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Indian Success Stories — Video Bot",
  description: "Automated YouTube video generation pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Hind:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
