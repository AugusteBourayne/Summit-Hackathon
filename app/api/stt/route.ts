import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/voice/stt";

export async function POST(req: NextRequest) {
  const { audio, format } = (await req.json()) as { audio: string; format?: string };
  const text = await transcribeAudio(audio, format ?? "wav");
  return NextResponse.json({ text });
}
