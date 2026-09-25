import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const DOCS_FILE="./docs.pdf";

async function loadDocument(filePath)
{
    const loader=new PDFLoader(filePath);
    return loader.load();

}

async function chunksDoc(docs){
    const splitter=new RecursiveCharacterTextSplitter({
        chunkSize:400,
        chunkOverlap:40,
    })
    return splitter.splitDocuments(docs);
}

const embedding=new GoogleGenerativeAIEmbeddings({
    model:"models/gemini-embedding-001",
});

async function buildStore(chunks, embedding) {
    return MemoryVectorStore.fromDocuments(chunks,embedding);
    
}

async function searchWithScore(store,question,k) {
   return store.similaritySearchWithScore(question,k);
}

// ---- run the pipeline ----
const docs = await loadDocument(DOCS_FILE);
const chunks = await chunksDoc(docs);
const store = await buildStore(chunks, embedding);


const goodQuestion="What is ?";
const goodResults=await searchWithScore(store ,goodQuestion,5);

console.log("QUESTION (expected relevant):", goodQuestion);
goodResults.forEach(([doc, score], i) => {
  console.log(`${i + 1}. score=${score.toFixed(7)}  ->  ${doc.pageContent.slice(0, 200)}`);
});
