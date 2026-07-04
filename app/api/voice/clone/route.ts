import { NextRequest, NextResponse } from "next/server";

// TODO(Auguste): remplacer ce mock par le vrai appel Gradium Voice Cloning (voir /lib/voice et /CONTRACTS.md).

export async function POST(_req: NextRequest) {
  return NextResponse.json({ voiceId: `mock-voice-${Date.now()}` });
}
