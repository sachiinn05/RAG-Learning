# store.mjs Notes

## What it does
Loads a PDF, chunks it, embeds every chunk, stores all vectors in one place (a
"vector store"), then asks a question and gets back the most relevant chunks.
This is the full retrieval half of RAG working end to end.

## Architecture (data flow)

```
docs.pdf
   |
   v
loadDocument()      <- LOAD (PDFLoader)          -> docs (one per page)
   |
   v
chunksDoc()         <- SPLIT (RecursiveCharacterTextSplitter) -> 33 chunks
   |
   v
MemoryVectorStore.fromDocuments(chunks, embedding)  <- EMBED + STORE
   |   (embeds every chunk, keeps text+vector together in memory)
   v
store
   |
   v
store.similaritySearch(question, k)  <- RETRIEVE
   |   (embeds the question, compares to all stored vectors, returns top k)
   v
results = [Document, Document, Document]
```

This is one step further than embded.mjs, which only compared 2 chunks by hand.
store.mjs builds a searchable database of ALL chunks and answers a real question
against it. Covers Load -> Split -> Embed -> Store -> Retrieve (Generate is last,
not done yet).

## The new part: MemoryVectorStore
```js
const store = await MemoryVectorStore.fromDocuments(chunks, embedding);
```
- embeds every chunk's text automatically (in bulk, instead of one-by-one)
- stores all (text + vector) pairs together, in memory (RAM only, lost when script ends)

## Retrieval: searchStore
```js
async function searchStore(store, question, k) {
  return store.similaritySearch(question, k);
}
```
Internally: embeds the question -> compares it (cosine similarity) against all 33
stored chunk vectors -> sorts by score -> returns top `k` matches.

## Result when run
Asked "What is deep copy?" -> got back 3 chunks, all genuinely about deep copy, none
containing the literal question text -> proves it matched by meaning, not keywords.
Ranking made sense too (most direct explanation first).

## Bugs fixed to get this working
1. `store` was never created — added `MemoryVectorStore.fromDocuments(...)` call.
2. import path `langchain/vectorstores/memory` no longer exists -> fixed to
   `@langchain/classic/vectorstores/memory`.
3. model `text-embedding-004` retired -> changed to `models/gemini-embedding-001`.
4. `.env` is in root but script runs from rag-js/ -> fixed with
   `dotenv.config({ path: "../.env" })`.

## Why this matters for RAG
- This is the actual "R" (Retrieval) in RAG — can now ask any question and get the
  most relevant chunks automatically, not just compare 2 by hand.
- MemoryVectorStore is in-memory only, good for learning. Real apps use a persistent
  vector DB (Chroma, Pinecone, FAISS) — but the logic stays the same.
- Missing piece for full RAG: send retrieved chunks + question to an LLM to generate
  an actual answer (the "G" in RAG).

## One-line interview answer
"store.mjs builds a full retrieval pipeline: loads and chunks a PDF, embeds every
chunk with Gemini's embedding model, and stores them in a MemoryVectorStore. Calling
similaritySearch embeds the question the same way and returns the top-k chunks by
cosine similarity — proving semantic retrieval works before adding generation."
