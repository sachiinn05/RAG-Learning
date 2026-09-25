# embded.mjs Notes

## What it does
Takes a PDF, loads it, chunks it, then converts each chunk's text into a list of numbers
(a "vector") called an embedding. Also compares vectors to check how similar two pieces
of text are.

## Architecture (data flow)

```
docs.pdf (file)
   |
   v
loadDocument()   <- Stage 1: LOAD (PDFLoader)
   |
   v
docs = [Document, Document, ...]   (one per PAGE)
   |
   v
chunkDoc()   <- Stage 2: SPLIT (RecursiveCharacterTextSplitter)
   |
   v
chunks = [Document, Document, ...]   (one per CHUNK, 33 items)
   |
   v
embeddings.embedQuery(chunk.pageContent)   <- Stage 3: EMBED (GoogleGenerativeAIEmbeddings)
   |
   v
vector = [0.01, -0.23, 0.11, ...]   (3072 numbers, one vector per chunk)
   |
   v
cosine(vectorA, vectorB)   <- Stage 4: COMPARE
   |
   v
similarity score (-1 to 1)
```

Same pattern as before: each stage takes the previous stage's output and transforms it
into the next shape. Load -> Split -> Embed -> Compare.

## Stage 1 + 2: loadDocument, chunkDoc
Same as chunker.mjs (see chunker.md). Loads PDF page by page, then splits into ~400 char
chunks with 60 char overlap.

## Stage 3: Embeddings
```js
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-001",
});
```
- creates a client that talks to Google's embedding API.
- `embeddings.embedQuery(text)` sends text to Google, gets back a vector (list of numbers).
- vector = a way to represent meaning of text as numbers, so a computer can compare
  "closeness" of meaning between two texts.
- model used: `models/gemini-embedding-001` (note: `text-embedding-004` is retired, this
  is the current working one, checked via Google's ListModels API).
- vector size here: 3072 numbers per chunk.

## Stage 4: cosine similarity (custom function)
```js
function cosine(a, b) {
  let dot = 0, lenA = 0, lenB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    lenA += a[i] * a[i];
    lenB += b[i] * b[i];
  }
  return dot / (Math.sqrt(lenA) * Math.sqrt(lenB));
}
```
- takes two vectors (a, b), returns one number between -1 and 1.
- 1 = same meaning/direction, 0 = unrelated, -1 = opposite meaning.
- formula: dot product of the two vectors / (length of a * length of b).
  - dot product = sum of a[i]*b[i] for every position -> measures how much they align.
  - dividing by lengths (magnitudes) normalizes it, so it only measures angle/direction,
    not how "long" the vectors are.
- this is the standard way to measure how similar two embeddings are.

## Driver code (bottom of file) / what it tests
```js
const docs = await loadDocument(DOCS_FILE);
const chunks = await chunkDoc(docs);

const vector0 = await embeddings.embedQuery(chunks[0].pageContent);
const vector1 = await embeddings.embedQuery(chunks[1].pageContent);

const unrelated = "The office coffee machine is broken again.";
const vectorUnrelated = await embeddings.embedQuery(unrelated);

cosine(vector0, vector1);          // chunk0 vs chunk1 (both about copy semantics)
cosine(vector0, vectorUnrelated);  // chunk0 vs random unrelated sentence
```
- embeds 2 real chunks from the PDF + 1 unrelated control sentence.
- compares chunk0-vs-chunk1 (should be similar topic) against chunk0-vs-unrelated
  (should be unrelated) to prove embeddings actually capture meaning.

## Actual result when run
- vector dimensions: 3072
- similarity chunk0 vs chunk1: 0.81 (high, both about Shallow/Deep Copy)
- similarity chunk0 vs unrelated: 0.48 (lower, unrelated topic)
- proves: embeddings put related meaning closer together than unrelated meaning.

## dotenv note
`.env` file lives in the root (RAG-LLM/), but the script runs from inside rag-js/, so
plain `dotenv/config` (which looks in current folder) won't find it. Fixed with:
```js
dotenv.config({ path: "../.env" });
```

## Why this stage matters for RAG
- this embedding step is what makes "search by meaning" possible instead of just
  keyword matching.
- later, when a user asks a question, the question also gets embedded into a vector,
  then compared (cosine similarity) against all stored chunk vectors to find the most
  relevant chunks -> those chunks get passed to the LLM to answer the question.
- this file is basically proving that step works, before wiring it into a real
  vector store + retrieval pipeline.

## One-line interview answer
"embded.mjs loads and chunks a PDF, then uses Google's gemini-embedding-001 model to
convert each chunk into a 3072-dimension vector. I used cosine similarity to confirm
that semantically related chunks score higher similarity than an unrelated sentence,
proving the embeddings capture meaning correctly before I plug them into a vector store
for retrieval."
