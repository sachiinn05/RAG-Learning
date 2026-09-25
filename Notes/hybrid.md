# hybrid.mjs Notes

## What it does
Runs TWO search methods on the same question, then merges the results into one
ranked list. This is "hybrid search" — combining meaning-based search with
keyword-based search to get better results than either alone.

## Architecture (data flow)

```
docs.pdf
   |
   v
loadDocument() -> chunkDoc()     (PDF -> pages -> chunks, same as before)
   |
   v
chunks
   |
   +-------------------+-------------------+
   |                                       |
   v                                       v
buildVectorStore(chunks)           buildBM25Retriever(chunks)
(embeds chunks, stores vectors)    (indexes chunks by word frequency)
   |                                       |
   v                                       v
similaritySearch(question)         bm25Retriever.invoke(question)
(meaning-based match)              (keyword-based match)
   |                                       |
   v                                       v
vectorResults (top 5)              bm25Results (top 5)
   |                                       |
   +-------------------+-------------------+
                        |
                        v
             rrf([vectorResults, bm25Results])
             (merges both ranked lists into one)
                        |
                        v
                merged results (final hybrid ranking)
```

## Two retrieval methods
**Vector search (semantic)** — embeds the question, compares to chunk vectors,
returns closest by meaning. Same idea as store.mjs / retrieve.mjs.
**BM25 (keyword search)** — classic search-engine algorithm, scores chunks by
word frequency. No meaning understanding, pure keyword matching.
Why both? Vector search can miss an exact keyword. BM25 can miss a paraphrase
with different words. Combining catches both cases.

## The merge: rrf() — Reciprocal Rank Fusion
```js
function rrf(lists, c = 60) {
  // for each result, score = 1 / (c + rank + 1)
  // if a chunk appears in multiple lists, its scores get added together
  return [...scores.values()].sort((a, b) => b.score - a.score);
}
```
- scores by RANK (position in the list), not raw similarity value.
- top result (rank 0) scores highest, 5th result scores lowest.
- a chunk appearing in BOTH lists gets both scores added -> rises to the top.
- `c = 60` softens score gaps (standard RRF default).

## Result when run (question: "What is Deep Copy ?")
- vector results: all genuinely about deep/copy topics.
- bm25 results: mostly relevant, but #1 was "Static Members" — off-topic, since
  BM25 only matches word frequency, not meaning.
- merged: the chunk found in BOTH lists rose to #1 in the final ranking, proving
  RRF rewards agreement between the two methods.

## Bugs fixed to get this working
1. import path `langchain/vectorstores/memory` -> `@langchain/classic/vectorstores/memory`
2. `.env` path -> `dotenv.config({ path: "../.env" })`
3. retired model `text-embedding-004` -> `models/gemini-embedding-001`
4. called `loadDocuments`/`chunkDocuments` (plural) but defined as
   `loadDocument`/`chunkDoc` -> fixed calls to match
5. `buildVectorStore` and `buildBM25Retriever` were called but never defined
   anywhere -> added both
6. `embeddings` (typo, undefined) -> `embedding`
7. sample question was unrelated to this PDF -> changed to a matching question

## Why this matters for RAG
Many production RAG systems use hybrid search because pure vector search alone can
miss exact keyword matches, and pure keyword search alone misses paraphrases. RRF
gives a simple, fair way to combine both without needing to tune weights manually.

## One-line interview answer
"hybrid.mjs combines vector search (semantic) and BM25 (keyword) retrieval, then
merges both ranked lists using Reciprocal Rank Fusion. RRF scores by rank position,
not raw score, so chunks both methods agree on rise to the top — more robust than
either method alone."
