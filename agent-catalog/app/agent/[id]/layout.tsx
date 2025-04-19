"use client";

import { QueryProvider } from "../../ClientQueryProvider";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}