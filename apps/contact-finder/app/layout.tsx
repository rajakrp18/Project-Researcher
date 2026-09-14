import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./pdf.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contact Finder | AI-Powered Indian Contact Investigation",
  description: "Find phone numbers for Indian contacts using AI-powered web search, multi-provider investigation, and intelligent contact attribution.",
};

import { ThemeProvider } from "./components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning style={{ overflowX: "hidden", overflowY: "hidden" }}>
      <body style={{ overflowY: "auto", height: "100vh" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
