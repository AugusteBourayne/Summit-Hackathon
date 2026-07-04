import { NextRequest, NextResponse } from "next/server";
import clones from "@/seed/clones.json";

// Profil comportemental d'un clone : résumé lisible + liste de comportements que la personne
// peut éditer/supprimer/ajouter depuis son propre profil.
//
// TODO(Géraud): remplacer ce mock par la vraie persistance (voir /lib/agent et /CONTRACTS.md).
// - GET  : renvoyer le { summary, behaviors } stocké pour ce clone.
// - POST : persister le { summary, behaviors } reçu, puis l'agent /api/ask DOIT synthétiser
//          à partir de cette liste (au lieu de personaProfile) — une suppression = le clone
//          cesse de s'appuyer sur ce comportement.

type Behavior = { id: string; text: string };
type CloneProfile = { summary: string; behaviors: Behavior[] };

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
  await params;
  const body = (await req.json()) as CloneProfile;
  // Mock : on renvoie simplement ce qui a été envoyé (pas de persistance réelle côté serveur
  // pour l'instant — c'est le point que Géraud branchera).
  return NextResponse.json<CloneProfile>({
    summary: body.summary ?? "",
    behaviors: Array.isArray(body.behaviors) ? body.behaviors : [],
  });
}
