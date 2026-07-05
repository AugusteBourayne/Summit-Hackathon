import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import clones from "@/seed/clones.json";

// Profil comportemental d'un clone : résumé lisible + liste de comportements que la personne
// peut éditer/supprimer/ajouter depuis son propre profil.
//
// Persiste directement dans seed/clones.json (même principe que le PATCH de voiceId/trained
// dans /api/clones/[cloneId]/route.ts) : sans ça, "Save changes" n'écrivait que dans le
// localStorage du navigateur de la personne qui sauvegarde — invisible pour un coequipier qui
// ouvre le meme profil depuis sa propre machine, meme apres avoir bien vu les documents
// (eux, reellement stockes cote Vultr, donc partages).

type Behavior = { id: string; text: string };
type CloneProfile = { summary: string; behaviors: Behavior[] };

const CLONES_PATH = path.join(process.cwd(), "seed", "clones.json");

const store = clones as Record<string, { summary?: string; behaviors?: Behavior[] }>;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> },
) {
  const { cloneId } = await params;
  const clone = store[cloneId];
  return NextResponse.json<CloneProfile>({
    summary: clone?.summary ?? "",
    behaviors: clone?.behaviors ?? [],
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> },
) {
  const { cloneId } = await params;
  const body = (await req.json()) as CloneProfile;
  const profile: CloneProfile = {
    summary: body.summary ?? "",
    behaviors: Array.isArray(body.behaviors) ? body.behaviors : [],
  };

  const raw = fs.readFileSync(CLONES_PATH, "utf-8");
  const allClones = JSON.parse(raw);

  if (!allClones[cloneId]) {
    return NextResponse.json({ error: `Unknown clone: ${cloneId}` }, { status: 404 });
  }

  allClones[cloneId] = { ...allClones[cloneId], ...profile };
  fs.writeFileSync(CLONES_PATH, JSON.stringify(allClones, null, 2), "utf-8");

  return NextResponse.json<CloneProfile>(profile);
}
