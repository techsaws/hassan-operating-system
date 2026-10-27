import type { Metadata } from "next";
import { Dashboard } from "@/components/layout/dashboard";
import "./globals.css";
export const metadata: Metadata = {
  title: "HassanOS — Client workspace",
  description: "Private client acquisition workspace",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Dashboard>{children}</Dashboard>
      </body>
    </html>
  );
}
