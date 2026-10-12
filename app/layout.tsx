import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridly — Opportunities that fit you",
  description: "Discover verified hackathons, competitions, grants, creative programs, and volunteering opportunities matched to your availability and experience.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
