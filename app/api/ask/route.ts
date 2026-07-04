import { NextRequest, NextResponse } from "next/server";

// TODO(Géraud): remplacer ce mock par la vraie boucle agent (voir /lib/agent et /CONTRACTS.md).
// Tant que ce mock est en place, le frontend (Raphaël) peut développer contre une réponse réaliste.

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text } = body as { cloneId: string; mode: "clone" | "interviewer"; text: string };

  return NextResponse.json({
    response: `[mock] Here's how I'd probably react to: "${text}"`,
    citations: [
      { text: "Last time we discussed a similar deadline, I asked for a two-day buffer.", source: "meeting-2026-06-12.txt" },
      { text: "Our team prioritizes the Q3 release over ad-hoc requests.", source: "team-context" },
    ],
    objections: [
      "This might conflict with the current sprint priorities.",
      "I'll probably ask what happens if we don't do this now.",
    ],
    suggestion: "Frame it around impact on the Q3 release, and propose a specific date.",
    steps: [
      "planned: classified as a scheduling request",
      "retrieved 2 personal docs",
      "retrieved 1 company doc",
      "checked calendar.json",
      "answered",
    ],
  });
}
