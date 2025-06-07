import { getAgentsFromSupabase } from "@/lib/agents";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  try {
    const agents = await getAgentsFromSupabase(agentId);
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json({ error: "Unable to fetch agents" }, { status: 500 });
  }
}
