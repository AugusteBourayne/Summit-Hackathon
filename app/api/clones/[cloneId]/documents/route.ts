import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/agent/documents";

// Liste les documents (groupes de chunks) ingeres pour le corpus personnel de ce clone,
// pour affichage/suppression individuelle dans le Training Studio.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> }
) {
  const { cloneId } = await params;
  const documents = await listDocuments(cloneId);
  return NextResponse.json({ documents });
}
