import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOCK27",
  description: "You own good clothes. You wear them wrong.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
        {/* Vercel Web Analytics — page views + visitors, including anonymous,
            not-logged-in traffic. No cookies, no PII; enable Web Analytics for
            the project in the Vercel dashboard for data to flow. */}
        <Analytics />
      </body>
    </html>
  );
}
