import { scopeToCollectionName } from "@/lib/agent/ingest";

const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";

function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

// Un extrait retrouve : le texte du chunk et le scope d'ou il provient (pour les citations).
export interface RetrievedChunk {
  content: string;
  source: string;
}

// Interroge une collection Vultr pour retrouver les top_k chunks les plus proches d'une requete.
// Renvoie un tableau vide si la collection n'existe pas encore (cas normal pour un clone non entraine).
export async function retrieve(
  scope: string,
  query: string,
  topK = 3
): Promise<RetrievedChunk[]> {
  const collectionName = scopeToCollectionName(scope);

  const res = await fetch(`${VULTR_BASE}/vector_store/${collectionName}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: query, top_k: topK }),
  });

  // Si la collection n'existe pas (404) ou toute autre erreur non bloquante,
  // on renvoie un tableau vide plutot que de faire planter toute la boucle agent.
  if (!res.ok) {
    return [];
  }

  const body = await res.json();
  const results = body.results ?? [];

  // On mappe la reponse Vultr vers notre format interne, en taguant chaque extrait avec son scope.
  return results.map((item: { content: string }) => ({
    content: item.content,
    source: scope,
  }));
}