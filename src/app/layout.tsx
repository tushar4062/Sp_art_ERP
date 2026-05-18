import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/index.css";
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "Little Brushes Studio - ERP System",
  description: "ERP system for Little Brushes Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
