import fs from "fs";
import path from "path";
import natural from "natural";

const kbDir = path.join(process.cwd(), "kb");
const files = fs.readdirSync(kbDir).filter(f => f.endsWith(".md"));

const tfidf = new natural.TfIdf();
const docs: { id: string; text: string }[] = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(kbDir, file), "utf8");
  tfidf.addDocument(text);
  docs.push({ id: file.replace(".md", ""), text });
}

const data = {
  docs,
};

fs.writeFileSync("kb.tfidf.json", JSON.stringify(data, null, 2));
console.log("TF-IDF index built.");