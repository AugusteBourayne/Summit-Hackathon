import { NextRequest, NextResponse } from "next/server";

// TODO(Auguste): remplacer ce mock par le vrai appel Gradium TTS (voir /lib/voice et /CONTRACTS.md).

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { voiceId } = body as { text: string; voiceId: string | null };

  return NextResponse.json({
    audioUrl: voiceId ? `/mock-audio/${voiceId}.mp3` : "/mock-audio/default.mp3",
  });
}
