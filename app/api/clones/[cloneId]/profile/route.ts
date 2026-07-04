import { NextRequest, NextResponse } from "next/server";

// Identité éditable d'un clone : nom d'affichage + avatar.
//
// TODO(backend): persister le { name, avatar } reçu. L'avatar arrive en data URL (base64) ;
// à stocker (ou uploader vers un bucket et ne garder que l'URL). Le mock se contente d'echo.

type ProfilePatch = { name?: string; avatar?: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cloneId: string }> },
) {
  await params;
  const body = (await req.json()) as ProfilePatch;
  return NextResponse.json<ProfilePatch>({ name: body.name, avatar: body.avatar });
}
