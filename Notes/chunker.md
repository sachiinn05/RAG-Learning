# chunker.mjs Notes

## What it does
Takes a PDF, loads it, then breaks it into small pieces called "chunks".
This is needed because whole pages are too big to search well later.

## Architecture (data flow)

```
docs.pdf (file)
   |
   v
loadDocuments()   <- Stage 1: LOAD (uses PDFLoader)
   |
   v
docs = [Document, Document, ...]   (one per PAGE, 11 items)
   |
   v
chunkDoc()   <- Stage 2: SPLIT (uses RecursiveCharacterTextSplitter)
   |
   v
chunks = [Document, Document, ...]   (one per CHUNK, more items)
```

Two stages, each takes an array of Document objects in and gives Document objects out.
Same shape every time: `{ pageContent, metadata }`. That's why stage 2 can directly
take stage 1's output as input, no conversion needed.

## Stage 1: loadDocuments
- input: file path
- output: array of Documents, one per page
- job: read the file + extract text (I/O + parsing)

## Stage 2: chunkDoc
- input: array of Documents (the pages)
- output: array of Documents, but smaller (chunks)
- settings used:
  - chunkSize: 400 -> each chunk is about 400 characters
  - chunkOverlap: 60 -> each chunk shares last 60 characters with next chunk
- job: cut big page text into small pieces, keep metadata attached to each piece

## Why split into chunks?
- A whole page can have too much mixed info, hard to search precisely.
- Small chunks = more accurate retrieval later (pull back only the relevant piece, not a whole page).

## Why "Recursive" splitter?
- Tries to cut on natural breaks first: paragraph -> sentence -> word.
- Avoids cutting a sentence in half if possible.

## Why overlap (60 chars)?
- Without overlap, a sentence sitting exactly at the cut point gets split in half, meaning lost.
- Overlap keeps a bit of shared text between chunks so context isn't lost at the edges.

## Driver code (bottom of file)
```js
const docs = await loadDocuments(DOCS_FILE);   // run stage 1
const chunks = await chunkDoc(docs);            // run stage 2 using stage 1 output
```
- await used because both steps do async work (reading file, processing text).

## Why split into two functions/stages instead of one big function?
- each stage has one job only (single responsibility)
- can swap loader later (pdf -> txt -> docx) without touching chunking code
- can tune chunkSize/chunkOverlap without touching loading code
- easier to test one stage alone

## One-line interview answer
"chunker.mjs loads a PDF page by page using PDFLoader, then uses RecursiveCharacterTextSplitter
to break each page into ~400 character chunks with 60 character overlap, so later retrieval
can pull back small focused pieces of text instead of whole pages, while overlap keeps context
from getting lost at the chunk boundaries."
