import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type KBItem = {
  id: string;
  filename: string;
  text: string;
  embedding: number[];
};

type Retrieved = {
  id: string;
  score: number;
  text: string;
};

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function loadIndex(): KBItem[] {
  const indexPath = path.join(process.cwd(), "kb.index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error("kb.index.json nu exista. ruleaza scripts/build-kb-index.ts");
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf8")) as KBItem[];
}

const KB = loadIndex();

export async function retrieve(query: string, k = 3): Promise<Retrieved[]> {
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const q = emb.data[0].embedding;

  return KB
    .map((item) => ({
      id: item.id,
      text: item.text,
      score: cosine(q, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}