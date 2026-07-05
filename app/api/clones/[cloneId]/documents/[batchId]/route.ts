import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/agent/documents";

// Supprime tous les chunks d'un document (identifie par son batchId) du corpus personnel.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cloneId: string; batchId: string }> }
) {
  const { cloneId, batchId } = await params;
  const deleted = await deleteDocument(cloneId, batchId);
  return NextResponse.json({ deleted });
}
