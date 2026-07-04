import { NextRequest, NextResponse } from "next/server";

// TODO(Auguste): remplacer ce mock par le vrai appel Gradium STT (voir /lib/voice et /CONTRACTS.md).

export async function POST(_req: NextRequest) {
  return NextResponse.json({ text: "[mock transcription] this is what the user said" });
}
