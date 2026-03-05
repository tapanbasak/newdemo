import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Config Console",
  description: "App Rule and PSG configuration consoles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-shell">{children}</body>
    </html>
  );
}
