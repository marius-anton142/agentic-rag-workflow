import fs from "fs";
import path from "path";
import natural from "natural";
import { NextRequest, NextResponse } from "next/server";

const data = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "kb.tfidf.json"), "utf8")
);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";

  const tfidf = new natural.TfIdf();
  data.docs.forEach((d: any) => tfidf.addDocument(d.text));

  const scores: { id: string; score: number }[] = [];

  tfidf.tfidfs(q, (i: number, measure: number) => {
    scores.push({ id: data.docs[i].id, score: measure });
  });

  scores.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    query: q,
    top3: scores.slice(0, 3),
  });
}
