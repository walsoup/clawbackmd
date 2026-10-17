import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listEnrichedClaims } from "@/lib/data";


export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const claims = await listEnrichedClaims();
    return NextResponse.json({ claims });
  } catch (e) {
    console.error("claims GET failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
