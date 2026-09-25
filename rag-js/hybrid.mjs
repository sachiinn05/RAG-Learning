import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const DOCS_FILE = "./docs.pdf";

async function loadDocument(filePath) {
    const loader=new PDFLoader(filePath);
    return loader.load();
}

async function chunkDoc(docs) {
    const splitter=new RecursiveCharacterTextSplitter({
        chunkSize:600,
        chunkOverlap:60,
    });
    return splitter.splitDocuments(docs);
}

const embedding=new GoogleGenerativeAIEmbeddings({
    model:"models/gemini-embedding-001",
});

// ---- the RRF merge logic, pure JS, no library ----
function rrf(lists, c = 60) {
  const scores = new Map(); // key: chunk text, value: { doc, score }

  for (const list of lists) {
    list.forEach((doc, index) => {
      const key = doc.pageContent; // using text itself as a unique-enough id
      const existing = scores.get(key);
      const contribution = 1 / (c + index + 1);

      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(key, { doc, score: contribution });
      }
    });
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}


async function buildVectorStore(chunks, embedding) {
    return MemoryVectorStore.fromDocuments(chunks, embedding);
}

function buildBM25Retriever(chunks) {
    return BM25Retriever.fromDocuments(chunks, { k: 5 });
}

// ---- run the pipeline ----
const docs = await loadDocument(DOCS_FILE);
const chunks = await chunkDoc(docs);

const vectorStore = await buildVectorStore(chunks, embedding);
const bm25Retriever = buildBM25Retriever(chunks);

const question = "What is Deep Copy ?"; // matches this PDF's content

const vectorResults = await vectorStore.similaritySearch(question, 5);
const bm25Results = await bm25Retriever.invoke(question);

console.log("--- vector results ---");
vectorResults.forEach((doc, i) => console.log(`${i + 1}.`, doc.pageContent.slice(0, 80)));

console.log("\n--- bm25 results ---");
bm25Results.forEach((doc, i) => console.log(`${i + 1}.`, doc.pageContent.slice(0, 80)));

const merged = rrf([vectorResults, bm25Results]);

console.log("\n--- merged (hybrid, RRF) ---");
merged.forEach((item, i) =>
  console.log(`${i + 1}. rrf_score=${item.score.toFixed(4)} -> ${item.doc.pageContent.slice(0, 80)}`)
);