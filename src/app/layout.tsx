import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "itpctakecare",
  description: "ITPC Take Care — ระบบบริหารจัดการและปฏิทินการดูแลนักเรียน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
