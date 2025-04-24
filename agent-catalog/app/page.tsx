"use client";

import { AgentGrid } from "@/components/agent-grid";
import { Header } from "@/components/header";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAgents } from "@/hooks/use-agents";

import dynamic from "next/dynamic";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// 👇 Dynamically import the provider to avoid server-side import trace
const ClientQueryProvider = dynamic(() => import("./ClientQueryProvider").then(mod => mod.QueryProvider), {
  ssr: false,
});

function HomeContent({ backgroundColor }: { backgroundColor: any }) {
  const { agents, loading, error } = useAgents();

  return (
    <motion.main className="min-h-screen" style={{ backgroundColor }}>
      <div className="absolute top-4 right-4 z-30">
        <ConnectButton />
      </div>
      <Header />
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
        {error ? (
          <div className="p-4 text-red-500">Error loading agents: {error}</div>
        ) : loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <AgentGrid agents={agents} />
        )}
      </div>
    </motion.main>
  );
}

export default function Page() {
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(scrollY, [0, 300], ["rgb(26, 26, 46)", "rgb(255, 255, 255)"]);

  return (
    <ClientQueryProvider>
      <HomeContent backgroundColor={backgroundColor} />
    </ClientQueryProvider>
  );
}
