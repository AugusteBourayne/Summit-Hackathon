import { NextRequest, NextResponse } from "next/server";
import { deriveNewBehaviors } from "@/lib/agent/summarize";

interface DeriveBody {
  name?: string;
  content?: string;
  existingBehaviors?: string[];
}

// Appele automatiquement apres chaque ingestion (document ou reponse d'interview) dans le
// Training Studio, pour deduire les nouveaux traits de comportement apportes par CE contenu
// precis — la liste des comportements grandit ainsi au fil des documents ajoutes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> }
) {
  try {
    await params;
    const body = (await req.json()) as DeriveBody;

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ behaviors: [] });
    }

    const name = body.name?.trim() || "cette personne";
    const behaviors = await deriveNewBehaviors(name, body.content, body.existingBehaviors ?? []);
    return NextResponse.json({ behaviors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
