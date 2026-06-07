import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundNest 基金投资工具",
  description: "基金养老、回本与收益对比的一站式测算工具。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
