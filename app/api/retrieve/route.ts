import { NextResponse } from "next/server";
import { retrieve } from "@/lib/retrieve";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const k = Number(searchParams.get("k") || "3");

  if (!q) {
    return NextResponse.json({ error: "Missing query param: q" }, { status: 400 });
  }

  const results = await retrieve(q, Number.isFinite(k) ? k : 3);
  return NextResponse.json({ q, results });
}