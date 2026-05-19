import type { Metadata } from "next";
import { ClientProviders } from "./client-providers";
import "@/index.css";

export const metadata: Metadata = {
  title: "Little Brushes Studio - ERP System",
  description: "ERP system for Little Brushes Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
