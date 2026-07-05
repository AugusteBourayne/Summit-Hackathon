import { scopeToCollectionName } from "@/lib/agent/ingest";

const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";

function getApiKey(): string | null {
  return process.env.VULTR_API_KEY ?? null;
}

export interface DocumentSummary {
  batchId: string;
  label: string;
  source: "upload" | "interview";
  chunkCount: number;
  createdAt: string;
}

interface RawItem {
  id: string;
  created: string;
  description?: string;
}

// La description d'un item est encodee "cle:valeur" separees par des "|" (voir lib/agent/ingest.ts).
function parseDescription(description: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of description.split("|")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    map[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return map;
}

async function listItems(cloneId: string, apiKey: string): Promise<RawItem[]> {
  const collectionName = scopeToCollectionName(`personal:${cloneId}`);
  const resp = await fetch(`${VULTR_BASE}/vector_store/${collectionName}/items`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  // Collection pas encore creee (clone jamais entraine) : pas une erreur, juste aucune donnee.
  if (!resp.ok) return [];
  const body = await resp.json();
  return (body.items ?? []) as RawItem[];
}

// Regroupe les chunks par document/reponse d'interview (meme "batch") pour affichage dans le
// Training Studio : un document uploade en 5 chunks doit apparaitre comme UNE seule ligne.
export async function listDocuments(cloneId: string): Promise<DocumentSummary[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const items = await listItems(cloneId, apiKey);
  const batches = new Map<string, DocumentSummary>();

  for (const item of items) {
    const meta = parseDescription(item.description ?? "");
    // Items ingeres avant l'ajout du batch/label (ancien format) : chacun devient son propre
    // document plutot que de disparaitre de la liste.
    const batchId = meta.batch ?? item.id;
    const source: "upload" | "interview" = meta.source === "interview" ? "interview" : "upload";
    const label = meta.label
      ? decodeURIComponent(meta.label)
      : source === "interview"
        ? "Interview answer"
        : "Untitled document";

    const existing = batches.get(batchId);
    if (existing) {
      existing.chunkCount += 1;
      if (item.created < existing.createdAt) existing.createdAt = item.created;
    } else {
      batches.set(batchId, { batchId, label, source, chunkCount: 1, createdAt: item.created });
    }
  }

  return Array.from(batches.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Supprime tous les chunks d'un document (meme batchId) de la collection Vultr.
export async function deleteDocument(cloneId: string, batchId: string): Promise<number> {
  const apiKey = getApiKey();
  if (!apiKey) return 0;

  const collectionName = scopeToCollectionName(`personal:${cloneId}`);
  const items = await listItems(cloneId, apiKey);
  const toDelete = items.filter((item) => {
    const meta = parseDescription(item.description ?? "");
    return (meta.batch ?? item.id) === batchId;
  });

  for (const item of toDelete) {
    await fetch(`${VULTR_BASE}/vector_store/${collectionName}/items/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }

  return toDelete.length;
}

// Recupere le contenu complet de chaque chunk personnel d'un clone (la liste d'items ne
// renvoie pas le contenu, il faut le redemander item par item) — sert de base a la
// generation automatique du profil comportemental.
export async function getAllChunkContents(cloneId: string): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const collectionName = scopeToCollectionName(`personal:${cloneId}`);
  const items = await listItems(cloneId, apiKey);

  const contents = await Promise.all(
    items.map(async (item) => {
      const res = await fetch(`${VULTR_BASE}/vector_store/${collectionName}/items/${item.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return "";
      const body = await res.json();
      return (body.item?.content as string) ?? "";
    })
  );

  return contents.filter((c) => c.length > 0);
}
