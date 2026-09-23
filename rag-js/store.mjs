import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const DOCS_FILE="./docs.pdf"
async function loadDocument(filePath) {
   const loader = new PDFLoader(filePath);
   return loader.load();    
}

async function chunksDoc(docs) {
    const splitter=new RecursiveCharacterTextSplitter({
       chunkSize:400,
       chunkOverlap:60,
    })
    return splitter.splitDocuments(docs);
}

const embedding=new GoogleGenerativeAIEmbeddings({
     model: "models/gemini-embedding-001",
})

async function searchStore(store,question,k) {
    return store.similaritySearch(question,k);
}


//--------- run the pipeline ---------//
const docs =await loadDocument(DOCS_FILE);
const chunks=await chunksDoc(docs);

console.log("total chunks", chunks.length);

const store=await MemoryVectorStore.fromDocuments(chunks, embedding);

const question="What is deep copy ?";
const results=await searchStore(store, question, 3);

console.log("question:", question);
console.log("top matches:", results.length);
results.forEach((doc, i) => {
  console.log(`\nmatch ${i + 1}:`, doc.pageContent);
  console.log("source:", doc.metadata.source);
});