import { Metadata } from "next";
import { fetchAgents } from "@/hooks/use-agents";
import { Agent } from "@/types/agent";
import AgentClient from "./AgentClient";
import { QueryProvider } from "../../ClientQueryProvider";


export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const agentResult = await fetchAgents(params.id);

  const agent: Agent | null =
    agentResult && !Array.isArray(agentResult) ? agentResult : null;

  const title = agent?.name ?? "Agent Profile";
  const description = agent?.description ?? "Meet our intelligent agent.";
  const image = agent?.avatar ?? "/default-agent-image.png";
  const url = `${process.env.NEXT_PUBLIC_PRODUCTION_URL}/agent/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      images: [
        {
          url: image,
          width: 800,
          height: 600,
          alt: `${title}'s profile image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function AgentPage({ params }: { params: { id: string } }) {
  return (
    <QueryProvider>
      <AgentClient id={params.id} />
    </QueryProvider>

  );
}
