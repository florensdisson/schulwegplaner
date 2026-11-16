import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schulwege Wannweil · Dein Weg zählt",
  description: "Schulwege einzeichnen und Papierbögen einreichen.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
