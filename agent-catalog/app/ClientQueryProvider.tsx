"use client"

import { queryClient } from "@/lib/query-client";
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { sepolia, arbitrumSepolia } from 'wagmi/chains';

import {
  QueryClientProvider,
} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: 'arbius.heyamica.com',
  projectId: "3cecb561af7700e7ff5184b55b39e05a",
  chains: [sepolia, arbitrumSepolia],
  ssr: false,
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}