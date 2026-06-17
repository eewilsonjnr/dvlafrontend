import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DVLA IDP/ICMV Issuance System",
  description: "Ghana DVLA International Driving Permit and ICMV Issuance Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
