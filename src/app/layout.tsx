import type { Metadata, Viewport } from "next";
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
  title: "DiscGolf Companion - Frisbeegolfradat & Tulospalvelu",
  description: "Selaa suomalaisia frisbeegolfratoja, kirjaa pelejä ja seuraa edistymistäsi. Yli 1000 rataa yksityiskohtaisilla tiedoilla.",
  keywords: ["disc golf", "discgolf", "frisbeegolf", "radat", "tulospalvelu", "scorecards", "suomi", "finland"],
  authors: [{ name: "DiscGolf Companion" }],
  icons: {
    icon: "/disc-golf-logo.png",
  },
  openGraph: {
    title: "DiscGolf Companion",
    description: "Selaa suomalaisia frisbeegolfratoja, kirjaa pelejä ja seuraa edistymistäsi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscGolf Companion",
    description: "Selaa suomalaisia frisbeegolfratoja, kirjaa pelejä ja seuraa edistymistäsi",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
