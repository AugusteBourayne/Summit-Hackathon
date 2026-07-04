import { NextRequest, NextResponse } from "next/server";
import { scopeToCollectionName } from "@/lib/agent/ingest";

const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";

// Compte les vrais chunks ingérés pour ce clone (documents + réponses d'interview), en
// interrogeant directement la collection Vultr du scope personal:<cloneId> — sert de base
// réelle au calcul de "clone accuracy" (au lieu d'un chiffre fixe côté front).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ cloneId: string }> }) {
  const { cloneId } = await params;
  const apiKey = process.env.VULTR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ docChunks: 0, interviewChunks: 0 });
  }

  const collectionName = scopeToCollectionName(`personal:${cloneId}`);
  const resp = await fetch(`${VULTR_BASE}/vector_store/${collectionName}/items`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  // Collection pas encore créée (clone jamais entraîné) : pas une erreur, juste zéro chunk.
  if (!resp.ok) {
    return NextResponse.json({ docChunks: 0, interviewChunks: 0 });
  }

  const body = await resp.json();
  const items = (body.items ?? []) as { description?: string }[];
  const interviewChunks = items.filter((item) => item.description?.includes("source:interview")).length;
  const docChunks = items.length - interviewChunks;

  return NextResponse.json({ docChunks, interviewChunks });
}
