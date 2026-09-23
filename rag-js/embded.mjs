import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const DOCS_FILE="./docs.pdf";
async function loadDocument(filePath)
{
    const loader=new PDFLoader(filePath);
    return loader.load();
}

async function  chunkDoc(docs) {

    const splitter= new RecursiveCharacterTextSplitter({
        chunkSize:400,
        chunkOverlap:60,
    })
    return splitter.splitDocuments(docs);
    
}


const embeddings=new GoogleGenerativeAIEmbeddings({
    model:"models/gemini-embedding-001",

});
function cosine(a,b)
{
    let dot=0;
    let lenA=0;
    let lenB=0;

    for(let i=0;i<a.length;i++)
    {
        dot+=a[i]*b[i];
        lenA+=a[i]*a[i];
        lenB+=b[i]*b[i];
    }

    return dot/(Math.sqrt(lenA)*Math.sqrt(lenB));
}


// ---- load + chunk your real PDF ----
const docs=await loadDocument(DOCS_FILE)
const chunks=await chunkDoc(docs);

console.log("total chunks:", chunks.length);
console.log("chunk 0:", chunks[0].pageContent);
console.log("chunk 1:", chunks[1].pageContent);

// ---- embed two real chunks from the PDF ----
const vector0 = await embeddings.embedQuery(chunks[0].pageContent);
const vector1 = await embeddings.embedQuery(chunks[1].pageContent);

// ---- embed one unrelated control sentence ----
const unrelated = "The office coffee machine is broken again.";
const vectorUnrelated = await embeddings.embedQuery(unrelated);

console.log("vector dimensions:", vector0.length);
console.log("similarity chunk0 vs chunk1:", cosine(vector0, vector1));
console.log("similarity chunk0 vs unrelated:", cosine(vector0, vectorUnrelated));