import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  title: "HarvestFile — Stop Leaving Money on the Table",
  description:
    "Discover USDA programs you qualify for and see exactly how much money you're leaving on the table. Free eligibility screening for US farmers.",
  openGraph: {
    title: "HarvestFile — Stop Leaving Money on the Table",
    description:
      "The average Midwest farm qualifies for $10,000-$40,000/year in USDA programs. Most never apply.",
    type: "website",
    url: "https://harvestfile.com",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
