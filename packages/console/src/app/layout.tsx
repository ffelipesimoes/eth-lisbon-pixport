import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PIXPORT Console",
  description: "Hedera mandate layer for Pix payments",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
