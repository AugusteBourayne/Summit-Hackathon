import { NextRequest, NextResponse } from "next/server";
import { ingest } from "@/lib/agent/ingest";

// Type attendu du corps de la requete, conforme a CONTRACTS.md.
interface IngestBody {
  scope: "team" | `personal:${string}`;
  content: string;
  source: "upload" | "interview";
  label?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestBody;

    // Validation minimale : on refuse une requete sans contenu exploitable.
// On verifie que content est une chaine non vide. Si ce n'est pas une string
    // (objet mal transmis, valeur nulle...), on refuse proprement sans planter.
    if (typeof body.content !== "string" || body.content.trim().length === 0) {      return NextResponse.json(
        { error: "Le champ 'content' est vide." },
        { status: 400 }
      );
    }

    // Appel a la logique metier. Vultr chunk, embed et stocke ; on recupere le compte.
    const chunksAdded = await ingest(body.scope, body.content, body.source, body.label);

    // Reponse au format exact du contrat : { chunksAdded: number }.
    return NextResponse.json({ chunksAdded });
  } catch (err) {
    // En cas d'echec (cle manquante, Vultr injoignable...), on renvoie une erreur lisible
    // plutot que de laisser le serveur planter en silence.
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}