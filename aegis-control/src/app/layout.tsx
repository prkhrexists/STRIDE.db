import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRIDE Dashboard — Infrastructure Inspection Platform",
  description: "STRIDE: Advanced UAV-powered infrastructure inspection and analysis platform. Real-time telemetry, AI defect detection, and comprehensive reporting.",
  keywords: "UAV inspection, drone dashboard, infrastructure monitoring, defect detection, STRIDE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
