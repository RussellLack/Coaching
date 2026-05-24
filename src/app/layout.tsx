import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConsentProvider } from "@/components/ConsentProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fab.partners"),
  title: "Fab Partners — Private coaching for the AI transition",
  description:
    "Confidential coaching for senior professionals navigating AI disruption. Precise work on identity, judgement and professional value.",
  openGraph: {
    title: "Fab Partners — Private coaching for the AI transition",
    description:
      "Confidential coaching for senior professionals navigating AI disruption.",
    url: "https://fab.partners",
    siteName: "Fab Partners",
    locale: "en_GB",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        <ConsentProvider>
          {children}
          <CookieBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
