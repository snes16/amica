"use client"

import type { Agent } from "@/types/agent"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Info } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import Link from "next/link"
import { useDiagnosisRunner } from "@/hooks/use-diagnosis"
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react"
import { CACHE_TTL } from "@/lib/query-client"

interface AgentCardProps {
  agent: Agent
  index: number
}

const AMICA_URL = process.env.NEXT_PUBLIC_AMICA_URL as string;

export function AgentCard({ agent, index }: AgentCardProps) {
  const { status, checking, handleDiagnosis } = useDiagnosisRunner(agent, index);
  const queryClient = useQueryClient();
  const hasChecked = useRef(false);

  // Check agent status on mount
  useEffect(() => {
    const cachedTimestamp = localStorage.getItem("agents_timestamp");
    const now = Date.now();
    
    // Cache status for TTL time
    if (!hasChecked.current && cachedTimestamp && now - parseInt(cachedTimestamp, 10) < CACHE_TTL) {
      handleDiagnosis();
      hasChecked.current = true;
    }
  }, []);

  // Update the agent status in the query cache when it changes
  useEffect(() => {
    if (!status) return;

    queryClient.setQueryData(["agents"], (old: Agent[] = []) =>
      old.map((a) =>
        a.id === agent.id
          ? { ...a, status } // update only the matching agent
          : a
      )
    );
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="overflow-hidden group bg-scifi-dark border-neon-blue/20 hover:border-neon-blue/40 transition-colors h-full flex flex-col">
        <CardHeader className="p-0">
          <div className="relative h-[320px] w-full overflow-hidden">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }} className=" relative h-full w-full">
              <Image
                src={agent.avatar || "/placeholder.svg"}
                alt={agent.name}
                className="object-cover object-center"
                fill
                priority
              />
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-orbitron font-semibold text-lg text-white">{agent.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neon-pink font-orbitron">{agent.price.toPrecision(2)} AIUS</span>
                <Badge
                  variant="secondary"
                  className="bg-neon-blue border-0 text-white font-roboto-mono hover:bg-neon-blue"
                >
                  {checking ? "loading" : status || agent.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-100/70 font-roboto-mono">Token: {agent.token}</p>
              <p className="text-sm text-blue-100/70 font-roboto-mono">
                Tier: {agent.tier.name} (Level {agent.tier.level})
              </p>
            </div>
            {/* Scrollable Description */}
            <div className="max-h-24 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-4/6 [&::-webkit-scrollbar-track]:bg-neon-blue/25 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              <p className="text-sm text-blue-100/70 font-roboto-mono whitespace-pre-line">
                {agent.description}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full font-roboto-mono border-neon-blue/50 text-neon-blue hover:bg-neon-blue/20 hover:text-white transition-colors"
              onClick={() => window.open(`${AMICA_URL}/agent/${agent.id}`, "_blank", "noopener,noreferrer")}
              disabled={agent.status !== "active"}
              title={agent.status !== "active" ? "Chat is disabled: Agent is inactive." : ""}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Link href={`/agent/${agent.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full font-roboto-mono border-neon-pink/50 text-neon-pink hover:bg-neon-pink/20 hover:text-white transition-colors"
              >
                <Info className="h-4 w-4 mr-2" />
                Details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

