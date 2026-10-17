import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { seedAll } from "@/lib/data";


export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const counts = await seedAll();
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    console.error("seed failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
