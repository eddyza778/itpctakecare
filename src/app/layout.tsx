import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "ITPC Techcare — ระบบดูแลนักเรียน",
  description: "เว็บแอปสำหรับครูที่ปรึกษาและผู้ดูแล ใช้บันทึกและติดตามการดูแลนักเรียนรายเคส",
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
