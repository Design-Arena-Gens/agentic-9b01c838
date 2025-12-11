import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyperion Tetris",
  description:
    "Hyperion Tetris — a cinematic, feature-packed Tetris experience engineered for the open web and Vercel deployments.",
  openGraph: {
    title: "Hyperion Tetris",
    description:
      "Dominate futuristic leaderboards with hyper drops, combo engines, and a glassmorphic arena.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyperion Tetris",
    description:
      "A market-defining Tetris build with hold mechanics, ghost pieces, and pro-tier analytics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
      >
        {children}
      </body>
    </html>
  );
}
