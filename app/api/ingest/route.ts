import { NextRequest, NextResponse } from "next/server";

// TODO(Géraud): remplacer ce mock par le vrai chunking + embeddings (voir /lib/agent et /CONTRACTS.md).

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content } = body as { scope: string; content: string; source: "upload" | "interview" };

  const chunksAdded = Math.max(1, Math.ceil(content.length / 500));

  return NextResponse.json({ chunksAdded });
}
