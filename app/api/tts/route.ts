import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice/tts";

export async function POST(req: NextRequest) {
  const { text, voiceId } = (await req.json()) as { text: string; voiceId: string | null };
  const audioUrl = await synthesizeSpeech(text, voiceId);
  return NextResponse.json({ audioUrl });
}
