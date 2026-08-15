import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);

  return {
    metadataBase: origin,
    title: "深度语音专家 · Deep Voice Expert",
    description:
      "以中文深度理解概念，用英、法、德术语、词源、维基知识图谱与多语语音建立可追溯的学习网络。",
    openGraph: {
      title: "深度语音专家 · Deep Voice Expert",
      description: "像词典一样精确，像语言教练一样会讲：多语概念、语音与知识链接学习工具。",
      images: [new URL("/og.png", origin).toString()],
    },
    twitter: {
      card: "summary_large_image",
      title: "深度语音专家",
      description:
        "A multilingual voice lexicon for deep concept learning in Chinese, English, French and German.",
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
