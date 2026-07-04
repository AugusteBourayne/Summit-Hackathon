import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Persiste les changements faits depuis la Training Studio (voiceId, trained) directement
// dans seed/clones.json — jusqu'ici ces changements ne survivaient qu'en mémoire de la page
// et se perdaient au rechargement, jamais visibles depuis la Room ou les autres pages.
const CLONES_PATH = path.join(process.cwd(), "seed", "clones.json");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cloneId: string }> }) {
  const { cloneId } = await params;
  const updates = (await req.json()) as Partial<{ voiceId: string | null; trained: boolean }>;

  const raw = fs.readFileSync(CLONES_PATH, "utf-8");
  const clones = JSON.parse(raw);

  if (!clones[cloneId]) {
    return NextResponse.json({ error: `Unknown clone: ${cloneId}` }, { status: 404 });
  }

  clones[cloneId] = { ...clones[cloneId], ...updates };
  fs.writeFileSync(CLONES_PATH, JSON.stringify(clones, null, 2), "utf-8");

  return NextResponse.json(clones[cloneId]);
}
