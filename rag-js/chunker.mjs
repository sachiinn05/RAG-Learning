import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const DOCS_FILE="./docs.pdf";

async function loadDocuments(filePath)
{
    const loader=new PDFLoader(filePath);
    return loader.load();
}

async function chunkDoc(docs) {
    const splitter=new RecursiveCharacterTextSplitter({
        chunkSize:400,
        chunkOverlap:60,
    });
    return splitter.splitDocuments((docs));
  

}
const docs=await loadDocuments(DOCS_FILE);
const chunks=await chunkDoc(docs);

console.log("original doc count:", docs.length);
console.log("chunk count:", chunks.length);
console.log("first chunk metadata:", chunks[0].metadata);
console.log("first chunk content:", chunks[0].pageContent);