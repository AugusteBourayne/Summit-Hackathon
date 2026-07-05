import { NextRequest, NextResponse } from "next/server";
import { generateProfile } from "@/lib/agent/summarize";

// Genere automatiquement le profil comportemental (resume + traits) a partir des documents
// deja ingeres pour ce clone. Le nom est fourni par le client (qui connait le nom d'affichage
// eventuellement renomme localement) plutot que relu depuis le seed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> }
) {
  try {
    const { cloneId } = await params;
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const name = body.name?.trim() || "cette personne";

    const profile = await generateProfile(name, cloneId);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
