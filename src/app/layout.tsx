import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buildr 3.0 - AI Website Builder",
  description: "Build stunning websites with AI. Describe your vision, get production-ready code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
