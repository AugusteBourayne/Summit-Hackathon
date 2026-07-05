import { NextRequest, NextResponse } from "next/server";
import { ingest } from "@/lib/agent/ingest";

// Type attendu du corps de la requete, conforme a CONTRACTS.md, etendu avec
// le support optionnel d'une image ou d'un fichier (PDF/Word) a extraire.
interface IngestBody {
  scope: "team" | `personal:${string}`;
  content: string;
  source: "upload" | "interview";
  label?: string;
  imageDataUrl?: string;
  fileDataUrl?: string;
  fileType?: "pdf" | "docx";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestBody;

    // Validation : il faut au moins une source de contenu (texte, image, ou fichier).
    const hasContent = typeof body.content === "string" && body.content.trim().length > 0;
    if (!hasContent && !body.imageDataUrl && !body.fileDataUrl) {
      return NextResponse.json(
        { error: "Le champ 'content', 'imageDataUrl' ou 'fileDataUrl' doit etre fourni." },
        { status: 400 }
      );
    }

    // Determine le contenu a ingerer selon la source fournie.
    let contentToIngest = body.content;

    if (body.imageDataUrl) {
      const { extractTextFromImage } = await import("@/lib/agent/extract");
      contentToIngest = await extractTextFromImage(body.imageDataUrl);
    } else if (body.fileDataUrl && body.fileType) {
      // Decode le fichier depuis son data URL (format "data:<mime>;base64,<donnees>").
      const base64Data = body.fileDataUrl.split(",")[1] ?? "";
      const fileBuffer = Buffer.from(base64Data, "base64");

      const { extractFromPdf, extractFromWord } = await import("@/lib/agent/extract");
      contentToIngest =
        body.fileType === "pdf"
          ? await extractFromPdf(fileBuffer)
          : await extractFromWord(fileBuffer);
    }

    // Appel a la logique metier. Vultr chunk, embed et stocke ; on recupere le compte.
    const chunksAdded = await ingest(body.scope, contentToIngest, body.source, body.label);

    // Reponse au format exact du contrat : { chunksAdded: number }.
    return NextResponse.json({ chunksAdded });
  } catch (err) {
    // En cas d'echec (cle manquante, Vultr injoignable, extraction ratee...), on renvoie
    // une erreur lisible plutot que de laisser le serveur planter en silence.
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}