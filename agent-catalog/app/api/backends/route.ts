import { getBackendsFromSupabase } from "@/lib/backends";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  try {
    const backends = await getBackendsFromSupabase(agentId); // pass agentId to your query function
    return NextResponse.json(backends);
  } catch (error) {
    return NextResponse.json({ error: "Unable to fetch backends" }, { status: 500 });
  }
}
