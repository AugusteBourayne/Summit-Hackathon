import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import path from "path";
import { pathToFileURL } from "url";

// Configure le worker PDF avec une URL de fichier valide (requis par le loader ESM de Node,
// notamment sur Windows ou les chemins bruts type "C:\..." sont rejetes).
const workerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdf-parse",
  "dist",
  "pdf-parse",
  "esm",
  "pdf.worker.mjs"
);
PDFParse.setWorker(pathToFileURL(workerPath).href);
const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";
const VISION_MODEL = "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16";
const CLEANUP_MODEL = "MiniMaxAI/MiniMax-M2.7";

function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

// Nettoie un texte brouillon (raisonnement brut d'un modele) pour n'en garder que le contenu utile,
// sans meta-commentaires ("Wait, let me check...", "Okay, let's see...").
async function cleanupExtractedText(rawText: string): Promise<string> {
  const res = await fetch(`${VULTR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CLEANUP_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Tu recois le brouillon de reflexion d'un modele qui a analyse une image. " +
            "Extrait UNIQUEMENT le contenu final utile (texte, donnees, informations), " +
            "sans commentaires meta comme 'Wait', 'Let me check', 'Okay'. " +
            "Reponds avec le contenu propre, structure, sans aucune explication de ta part.",
        },
        { role: "user", content: rawText },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    // Si le nettoyage echoue, on renvoie le texte brut plutot que de tout faire planter.
    return rawText;
  }

  const body = await res.json();
  const cleaned: string = body.choices?.[0]?.message?.content ?? "";
  return cleaned.trim() || rawText;
}

// Extrait le contenu textuel d'une image (photo, capture d'ecran, scan) via le modele de vision Vultr,
// puis nettoie le resultat pour ne garder que l'information utile.
export async function extractTextFromImage(imageDataUrl: string): Promise<string> {
  const res = await fetch(`${VULTR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcris fidelement tout le texte visible dans cette image. Si c'est un document (compte-rendu, note), retranscris son contenu integralement. Reponds uniquement avec le texte extrait, sans commentaire ni introduction.",
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      // Budget large : les modeles "reasoning" consomment des tokens pour leur
      // raisonnement interne avant d'ecrire la reponse finale.
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Echec extraction vision Vultr: ${res.status} - ${detail}`);
  }

  const body = await res.json();
  const message = body.choices?.[0]?.message ?? {};
  // "reasoning" est le vrai nom du champ pour ce modele (verifie dans les logs de test).
  const rawText: string = message.content || message.reasoning || "";

  if (!rawText.trim()) {
    throw new Error("Le modele de vision n'a renvoye aucun texte exploitable.");
  }

  // Deuxieme passe : nettoie le brouillon pour ne garder que le contenu utile.
  return cleanupExtractedText(rawText.trim());
}

// Extrait le texte natif et les images d'un PDF, puis decrit chaque image via le modele de vision.
// fileBuffer doit etre le contenu binaire brut du fichier PDF.
export async function extractFromPdf(fileBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: fileBuffer });
  const data = await parser.getText();
  const nativeText = data.text.trim();

  // pdf-parse n'extrait pas les images ; pour un PDF, le texte natif est notre principale source.
  // Les schemas/images de PDF necessiteraient une rasterisation de page, hors scope pour l'instant.
  if (!nativeText) {
    throw new Error("Aucun texte extrait du PDF (peut-etre un PDF scanne sans texte natif).");
  }

  return nativeText;
}

// Extrait le texte natif et les images d'un document Word (.docx), decrit chaque image trouvee
// via le modele de vision, puis combine texte et descriptions en un seul contenu.
export async function extractFromWord(fileBuffer: Buffer): Promise<string> {
  const imageDescriptions: string[] = [];

  // mammoth permet de transformer chaque image rencontree via un convertisseur personnalise.
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  const nativeText = result.value.trim();

  // Deuxieme passe : extraction des images du document pour les decrire via la vision.
  const imageResult = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        const dataUrl = `data:${image.contentType};base64,${base64}`;
        try {
          const description = await extractTextFromImage(dataUrl);
          imageDescriptions.push(description);
        } catch {
          // Si la description d'une image echoue, on continue sans bloquer tout le document.
        }
        return { src: "" };
      }),
    }
  );
  // On ignore le HTML genere (imageResult.value) : seul l'effet de bord (imageDescriptions) nous interesse.
  void imageResult;

  const combined = [nativeText, ...imageDescriptions.map((d, i) => `[Image ${i + 1}] ${d}`)]
    .filter(Boolean)
    .join("\n\n");

  if (!combined.trim()) {
    throw new Error("Aucun contenu exploitable extrait du document Word.");
  }

  return combined;
}