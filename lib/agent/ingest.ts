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

// Decoupe un texte en morceaux d'environ 500 tokens avec un chevauchement.
// Approximation simple : 1 token ~ 4 caracteres, donc 500 tokens ~ 2000 caracteres.
// Le chevauchement evite de couper une idee en deux entre deux chunks.
function chunkText(text: string, chunkChars = 2000, overlapChars = 200): string[] {
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

  // Petite pause pour laisser Vultr indexer la nouvelle collection avant qu'on y ajoute un item.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return body.id;
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
  source: "upload" | "interview"
): Promise<number> {
  const chunks = chunkText(content);

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

  // On envoie les chunks un par un. La description encode la source, utile pour le debug et le retrieval.
  for (let i = 0; i < chunks.length; i++) {
    const description = `source:${source} scope:${scope} chunk:${i}`;
    await addItem(collectionId, chunks[i], description);
  }

  return chunks.length;
}