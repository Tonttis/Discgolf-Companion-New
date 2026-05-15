import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DiscGolf Companion - Courses & Competition Scorecards",
  description: "Find disc golf courses, explore competition results, and track scores with detailed hole-by-hole scorecards. Powered by DiscGolfMetrix.",
  keywords: ["disc golf", "discgolf", "courses", "scorecards", "competitions", "DiscGolfMetrix", "frisbee golf"],
  authors: [{ name: "DiscGolf Companion" }],
  icons: {
    icon: "/disc-golf-logo.png",
  },
  openGraph: {
    title: "DiscGolf Companion",
    description: "Find courses, track scores, explore competitions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscGolf Companion",
    description: "Find courses, track scores, explore competitions",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
