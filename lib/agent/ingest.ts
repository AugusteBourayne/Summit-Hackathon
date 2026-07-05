import crypto from "crypto";

// URL de base de l'API Vultr Inference (compatible OpenAI pour le chat, endpoints maison pour le vector store).
const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";

// Recupere la cle depuis les variables d'environnement chargees par Next.js (.env.local).
function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

// Traduit un scope du contrat ("team" ou "personal:<cloneId>") en un nom de collection
// court et deterministe, compatible avec la limite de 14 caracteres de Vultr.
export function scopeToCollectionName(scope: string): string {
  if (scope === "team") {
    return "f2f_team";
  }
  // Pour un scope personnel, on hashe le cloneId pour obtenir un suffixe court et stable.
  const cloneId = scope.replace(/^personal:/, "");
  const shortHash = crypto.createHash("md5").update(cloneId).digest("hex").slice(0, 8);
  return `f2f_p_${shortHash}`;
}

// Decoupe un texte en morceaux avec un chevauchement.
// L'approximation "1 token ~ 4 caracteres" s'est averee trop optimiste sur des
// transcriptions en francais (ponctuation/accents alourdissent le ratio token/caractere) :
// des chunks de 2000 caracteres depassaient systematiquement la limite de tokens de Vultr
// (422 "Maximum sequence length exceeded"), pas seulement de facon transitoire.
// On vise donc une marge large : 700 caracteres.
function chunkText(text: string, chunkChars = 700, overlapChars = 80): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    chunks.push(text.slice(start, end));
    // On avance en laissant un chevauchement avec le chunk precedent.
    start = end - overlapChars;
    if (start < 0) start = 0;
    if (end === text.length) break;
  }
  return chunks;
}

// Verifie si une collection portant ce nom existe deja, et renvoie son id le cas echeant.
// Vultr tronque les noms, donc on compare sur le nom renvoye par l'API, pas sur celui envoye.
async function findCollectionId(name: string): Promise<string | null> {
  const res = await fetch(`${VULTR_BASE}/vector_store`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) {
    throw new Error(`Echec listing collections Vultr: ${res.status}`);
  }
  const body = await res.json();
  // La reponse peut arriver sous forme de tableau direct ou enveloppee ; on gere les deux.
// Vultr enveloppe la liste dans un champ "collections". On gere aussi le cas tableau nu par securite.
  const collections = Array.isArray(body) ? body : body.collections ?? [];  const match = collections.find((c: { name: string }) => c.name === name);
  return match ? match.id : null;
}

// Cree une collection et renvoie son id.
async function createCollection(name: string): Promise<string> {
  const res = await fetch(`${VULTR_BASE}/vector_store`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Echec creation collection Vultr: ${res.status} - ${detail}`);
  }
  const body = await res.json();

  // Vultr enveloppe la collection creee dans un champ "collection" : { collection: { id, name } }.
  // (Lire body.id directement renvoyait undefined -> "Collection not found" a l'ajout d'item.)
  // L'identifiant utilise par les endpoints /items et /search est le nom (id === name).
  const created = body.collection ?? body;

  // Petite pause pour laisser Vultr indexer la nouvelle collection avant qu'on y ajoute un item.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return created.id ?? created.name ?? name;
}

// S'assure qu'une collection existe pour ce scope : la reutilise si presente, la cree sinon.
async function ensureCollection(scope: string): Promise<string> {
  const name = scopeToCollectionName(scope);
  const existingId = await findCollectionId(name);
  if (existingId) {
    return existingId;
  }
  return createCollection(name);
}

// Envoie un morceau de texte dans une collection Vultr. Vultr calcule l'embedding en interne.
async function addItem(collectionId: string, content: string, description: string): Promise<void> {
  const res = await fetch(`${VULTR_BASE}/vector_store/${collectionId}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, description }),
  });
  if (!res.ok) {
    // On lit la reponse Vultr pour connaitre la raison exacte du refus de l'item.
    const detail = await res.text();
    throw new Error(`Echec ajout item Vultr: ${res.status} - ${detail}`);
  }
}

// Fonction principale appelee par la route /api/ingest.
// Chunk le contenu, garantit la collection, envoie chaque chunk, renvoie le nombre de chunks ajoutes.
export async function ingest(
  scope: string,
  content: string,
  source: "upload" | "interview",
  label?: string
): Promise<number> {
  const chunks = chunkText(content);
  // batchId regroupe tous les chunks issus d'un meme document/reponse pour pouvoir
  // les lister et les supprimer ensemble depuis le Training Studio.
  const batchId = crypto.randomUUID();
  const encodedLabel = encodeURIComponent(label?.trim() || (source === "interview" ? "Interview answer" : "Untitled document"));

  // Mode demo / hors-ligne : sans VULTR_API_KEY configuree, on n'appelle pas le vector store
  // (sinon la route renvoie un 500 et le Training Studio est inutilisable). On "accepte" quand
  // meme le document en renvoyant le nombre de chunks decoupes localement. Des que la cle est
  // renseignee dans .env.local, le vrai chemin Vultr ci-dessous s'execute normalement.
  if (!process.env.VULTR_API_KEY) {
    console.warn(
      "[ingest] VULTR_API_KEY absente — ingestion simulee (mode demo, aucun stockage vectoriel)."
    );
    return chunks.length;
  }

  const collectionId = await ensureCollection(scope);

  // Envoie un morceau, et si Vultr le rejette pour depassement de tokens, le decoupe en deux
  // et reessaie chaque moitie recursivement plutot que de renvoyer le meme contenu identique
  // (qui echouerait exactement pareil). Les vrais echecs transitoires beneficient d'une pause.
  async function sendChunk(text: string, index: number, depth = 0): Promise<void> {
    const description = `source:${source}|scope:${scope}|batch:${batchId}|label:${encodedLabel}|chunk:${index}`;
    try {
      await addItem(collectionId, text, description);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTooLong = message.includes("Maximum sequence length exceeded");
      if (isTooLong && depth < 4 && text.length > 100) {
        console.warn(`[ingest] chunk ${index} trop long, decoupe en deux (profondeur ${depth}):`, message);
        const mid = Math.floor(text.length / 2);
        await sendChunk(text.slice(0, mid), index, depth + 1);
        await sendChunk(text.slice(mid), index, depth + 1);
        return;
      }
      console.warn(`[ingest] echec chunk ${index}, nouvel essai dans 1s:`, message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Si ce deuxieme essai echoue aussi, on laisse l'erreur remonter : mieux vaut un vrai
      // message d'erreur cote interface qu'un faux succes qui cache une perte de donnees.
      await addItem(collectionId, text, description);
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    await sendChunk(chunks[i], i);
  }

  return chunks.length;
}