import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type KBItem = {
  id: string;
  filename: string;
  text: string;
  embedding: number[];
};

async function main() {
  const kbDir = path.join(process.cwd(), "kb");
  if (!fs.existsSync(kbDir)) {
    throw new Error(`nu exista folderul kb`);
  }

  const files = fs
    .readdirSync(kbDir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort();

  if (files.length === 0) {
    throw new Error("nu exista regulile");
  }

  const items: KBItem[] = [];

  for (const filename of files) {
    const fullPath = path.join(kbDir, filename);
    const text = fs.readFileSync(fullPath, "utf8").trim();

    if (!text) continue;

    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    items.push({
      id: filename.replace(/\.md$/i, ""),
      filename,
      text,
      embedding: emb.data[0].embedding,
    });

    console.log(`Indexed: ${filename}`);
  }

  const outPath = path.join(process.cwd(), "kb.index.json");
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2), "utf8");

  console.log(`\nDone. Wrote: ${outPath}`);
  console.log(`Items: ${items.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});