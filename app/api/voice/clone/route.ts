import { NextRequest, NextResponse } from "next/server";
import { cloneVoice } from "@/lib/voice/clone";

export async function POST(req: NextRequest) {
  const { audioSample, name } = (await req.json()) as { audioSample: string; name?: string };
  const voiceId = await cloneVoice(audioSample, name);
  return NextResponse.json({ voiceId });
}
