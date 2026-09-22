import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const DOCS_FILE="./docs.pdf";

async function loadDocuments(filePath)
{
    const loader=new PDFLoader(filePath);
    return loader.load();
}
const docs=await loadDocuments(DOCS_FILE);
console.log("document count:", docs.length);
console.log("first doc metadata",docs[0].metadata);
console.log("first doc preview",docs[0].pageContent.slice(0,100));

