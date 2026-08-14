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
    title: "全媒体领域学院 · Omnimedia Lecturer",
    description:
      "以 CLIL 教学法连接八大学科与中、英、法、德四种语言的多模态学术学院。",
    openGraph: {
      title: "全媒体领域学院 · Omnimedia Lecturer",
      description: "知识为体，语言为用：八大学科的 CLIL 多语学习平台。",
      images: [new URL("/og.png", origin).toString()],
    },
    twitter: {
      card: "summary_large_image",
      title: "全媒体领域学院",
      description:
        "Eight academic campaigns with Chinese-led EN / FR / DE terminology learning.",
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
