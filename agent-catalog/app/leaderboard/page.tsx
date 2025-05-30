"use client";

import { useEffect, useState } from "react";
import { useAgents } from "@/hooks/use-agents";
import { Agent } from "@/types/agent";
import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

type Score = {
    agentId: string;
    vrm: number;
    chatbot: number;
    tts: number;
    stt: number;
    vision: number;
    amicaLife: number;
    talentShowScore: number;
};

function AgentCard({
    agent,
    rank,
    score,
}: {
    agent: Agent;
    rank: number;
    score: Score;
}) {
    const bgColors = [
        "bg-gradient-to-r from-yellow-300 to-yellow-100 dark:from-yellow-700 dark:to-yellow-900",
        "bg-gradient-to-r from-gray-200 to-gray-100 dark:from-zinc-800 dark:to-zinc-700",
        "bg-gradient-to-r from-orange-200 to-orange-100 dark:from-orange-800 dark:to-orange-700",
    ];

    return (
        <div
            className={cn(
                "flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border dark:border-zinc-700 bg-white dark:bg-zinc-900",
                rank < 3 && bgColors[rank]
            )}
        >
            {/* Agent Info */}
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-10 text-2xl font-extrabold text-center text-zinc-700 dark:text-zinc-300">
                    #{rank + 1}
                </div>

                <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-zinc-200 dark:border-zinc-700"
                />

                <div>
                    <div className="font-semibold text-lg text-zinc-800 dark:text-zinc-100">{agent.name}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Tier: {agent.tier?.name} • Category: {agent.category}
                    </div>
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 w-full md:w-auto text-sm text-right">
                {[
                    { label: "VRM", value: score.vrm },
                    { label: "Chatbot", value: score.chatbot },
                    { label: "TTS", value: score.tts },
                    { label: "STT", value: score.stt },
                    { label: "Vision", value: score.vision },
                    { label: "Amica Life", value: score.amicaLife },
                    { label: "Talent", value: score.talentShowScore },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {value.toFixed(1)}
                        </div>
                        <div className="text-zinc-500 text-xs">{label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { agents, loading, error } = useAgents() as {
        agents: Agent[];
        loading: boolean;
        error: string | null;
    };
    const [scores, setScores] = useState<Score[]>([]);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            const { data, error } = await supabase.from("agent-score").select("*");
            if (error) {
                console.error("Error fetching scores:", error.message);
                setChecking(false);
                return;
            }
            if (data) {
                const sorted = data.sort(
                    (a, b) => b.talentShowScore - a.talentShowScore
                );
                setScores(sorted);
                setChecking(false);
            }
        };

        fetchScores();
    }, []);

    if (loading || checking) {
        return <div className="p-8 text-center text-zinc-500">Loading leaderboard...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Error loading agents: {error}
            </div>
        );
    }

    const agentsMap: Record<string, Agent> = Object.fromEntries(
        agents.map((agent) => [agent.agentId, agent])
    );

    return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <h1 className="text-4xl font-bold mb-10 flex items-center gap-3 justify-center text-center">
                <TrophyIcon className="text-yellow-500 w-8 h-8" />
                <span>Agent Leaderboard</span>
            </h1>

            <div className="grid gap-6">
                {scores.map((score, index) => {
                    const agent = agentsMap[score.agentId];
                    if (!agent) return null;
                    return (
                        <Link key={score.agentId} href={`/agent/${agent.agentId}`} className="block">
                            <AgentCard agent={agent} rank={index} score={score} />
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
