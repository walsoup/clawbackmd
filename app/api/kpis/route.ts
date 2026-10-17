import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeKpis } from "@/lib/kpis";


export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const kpis = await computeKpis();
    return NextResponse.json(kpis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
