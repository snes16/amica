"use client";

import { useEffect, useState } from "react";
import { Agent } from "@/types/agent";
import { Trophy, Star, User, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

import { Header, LeaderboardHeader } from "@/components/header";
import { motion, useScroll, useTransform } from "framer-motion";
import { fetchAgentStats } from "@/lib/agents";

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

function AgentCard({ agent, rank, score }: { agent: Agent; rank: number; score: Score }) {
    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 0:
                return {
                    gradient: "from-amber-400 via-yellow-300 to-amber-400",
                    border: "border-amber-300",
                    shadow: "shadow-amber-200/50",
                    icon: "text-amber-600",
                    rank: "text-amber-700"
                };
            case 1:
                return {
                    gradient: "from-slate-300 via-gray-200 to-slate-300",
                    border: "border-slate-300",
                    shadow: "shadow-slate-200/50",
                    icon: "text-slate-600",
                    rank: "text-slate-700"
                };
            case 2:
                return {
                    gradient: "from-orange-300 via-amber-200 to-orange-300",
                    border: "border-orange-300",
                    shadow: "shadow-orange-200/50",
                    icon: "text-orange-600",
                    rank: "text-orange-700"
                };
            default:
                return {
                    gradient: "from-slate-50 to-white",
                    border: "border-slate-200",
                    shadow: "shadow-slate-100/50",
                    icon: "text-slate-500",
                    rank: "text-slate-600"
                };
        }
    };

    const getCategoryTitle = (category: string) => {
        switch (category.toLowerCase()) {
            case 'security': return 'Security';
            case 'crypto': return 'Crypto';
            case 'personalAssistant': return 'Personal Assistant';
            case 'researcher': return 'Researcher';
            case 'programmer': return 'Programmer';
            default: return 'General';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'security': return '🛡️';
            case 'crypto': return '₿';
            case 'personalAssistant': return '👤';
            case 'researcher': return '🔬';
            case 'programmer': return '💻';
            default: return '🤖';
        }
    };

    const style = getRankStyle(rank);
    const isTopThree = rank < 3;

    return (
        <div role="link" className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${isTopThree ? `bg-gradient-to-br ${style.gradient} ${style.border} ${style.shadow} shadow-lg border-2` : 'bg-white border border-slate-200 shadow-md hover:shadow-lg'}`}>
            {/* Rank Badge */}
            <div className={`absolute top-4 left-4 flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${isTopThree ? 'bg-white/90 backdrop-blur-sm' : 'bg-slate-100'} ${style.rank} shadow-sm`}>
                #{rank + 1}
            </div>

            {/* Trophy for top 3 */}
            {isTopThree && (
                <div className={`absolute top-4 right-4 ${style.icon}`}>
                    <Trophy className="w-6 h-6" />
                </div>
            )}

            <div className="p-6 pt-20">
                {/* Agent Profile */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                        <div className={`w-16 h-16 rounded-full overflow-hidden border-3 ${isTopThree ? 'border-white/60' : 'border-slate-200'} shadow-md`}>
                            <img
                                src={agent.avatar}
                                alt={agent.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23e2e8f0"/><text x="32" y="36" text-anchor="middle" font-size="24" fill="%23475569">👤</text></svg>`;
                                }}
                            />
                        </div>
                        <div className="absolute -bottom-1 -right-1 text-lg">
                            {getCategoryIcon(agent.category)}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{agent.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium">
                                {agent.tier?.name}
                            </span>
                            <span>•</span>
                            <span>{getCategoryTitle(agent.category)}</span>
                        </div>
                        <p className="text-sm text-slate-500">{agent.description}</p>
                    </div>
                </div>

                {/* Score Metrics */}
                <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-violet-600" />
                            <span className="font-semibold text-slate-700">Talent Score</span>
                        </div>
                        <span className="text-2xl font-bold text-violet-700">{score.talentShowScore.toFixed(1)}</span>
                    </div>

                    {/* Detailed Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "VRM", value: score.vrm, icon: "🎭" },
                            { label: "Vision", value: score.vision, icon: "👁️" },
                            { label: "TTS", value: score.tts, icon: "🗣️" },
                            { label: "STT", value: score.stt, icon: "👂" },
                            { label: "Chatbot", value: score.chatbot, icon: "💬" },
                            { label: "Amica Life", value: score.amicaLife, icon: "🌟" }
                        ].map(({ label, value, icon }) => (
                            <div key={label} className="text-center p-3 bg-white/40 backdrop-blur-sm rounded-lg border border-white/30">
                                <div className="text-lg mb-1">{icon}</div>
                                <div className="font-bold text-slate-700">{value.toFixed(0)}</div>
                                <div className="text-xs text-slate-500 font-medium">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { scrollY } = useScroll();
    const backgroundColor = useTransform(scrollY, [0, 300], ["rgb(26, 26, 46)", "rgb(255, 255, 255)"]);

    const [agents, setAgents] = useState<Agent[] | null>(null);
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetchs agent
    useEffect(() => {
        let isMounted = true;

        const loadAgents = async () => {
            console.log("Load agents..")
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/agents");
                if (!res.ok) throw new Error("Failed to fetch agents. ");
                const data = await res.json();
                const agents = await fetchAgentStats(data);
                if (isMounted) {
                    setAgents(Array.isArray(agents) ? agents : [agents]);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Error loading agents.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadAgents();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const fetchScores = async () => {
            console.log("Load scores..")
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

    return (
        <motion.main className="min-h-screen" style={{ backgroundColor }}>
            {/* Hero Header */}
            <LeaderboardHeader />

            {error ? (
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
                    <div className="p-4 text-red-500">Error loading agents: {error}</div>
                </div>

            ) : loading || checking ? (
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    </div>
                </div>

            ) : (
                <>
                    {/* Leaderboard Content */}
                    <div className="relative px-4 pb-16 sm:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">

                            {/* Stats Bar */}
                            <div className="flex justify-center mt-8 mb-12">
                                <div className="flex items-center gap-8 px-6 py-3 bg-white rounded-full border border-gray-300 shadow">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-black">{scores.length}</div>
                                        <div className="text-sm text-gray-700">Active Agents</div>
                                    </div>
                                    <div className="w-px h-8 bg-gray-300"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-black">
                                            {Math.max(...scores.map(s => s.talentShowScore)).toFixed(1)}
                                        </div>
                                        <div className="text-sm text-gray-700">Top Score</div>
                                    </div>
                                    <div className="w-px h-8 bg-gray-300"></div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-black">7</div>
                                        <div className="text-sm text-gray-700">Categories</div>
                                    </div>
                                </div>
                            </div>


                            {/* Agent Cards */}
                            <div className="grid gap-6">
                                {scores.map((score, index) => {
                                    const agent = agents?.find(agent => agent.agentId === score.agentId);
                                    if (!agent) return null;
                                    return (
                                        <Link key={score.agentId} href={`/agent/${score.agentId}`} passHref>
                                            <AgentCard
                                                agent={agent}
                                                rank={index}
                                                score={score}
                                            />
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="text-center mt-12 pt-8 border-t border-white/10">
                                <p className="text-slate-400 text-sm">
                                    Rankings updated in real-time based on comprehensive AI capabilities assessment
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </motion.main >
    );
}
