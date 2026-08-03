import { NextResponse } from "next/server";
import { loadManifest } from "@/lib/manifest";
import { addRemovedId } from "@/lib/r2";

// Single shared password, checked server-side only — this is a personal
// gallery with one owner, not a multi-user system, so a full auth setup
// would be more machinery than the problem calls for.
export async function POST(request: Request) {
  const password = process.env.GALLERY_ADMIN_PASSWORD;
  if (!password) {
    console.error("[api/photos/remove] GALLERY_ADMIN_PASSWORD is not set");
    return NextResponse.json({ error: "Removal is not configured" }, { status: 500 });
  }

  let body: { id?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password !== password) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const manifest = loadManifest();
  if (!manifest?.some((item) => item.id === body.id)) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  await addRemovedId(body.id);
  return NextResponse.json({ ok: true });
}
