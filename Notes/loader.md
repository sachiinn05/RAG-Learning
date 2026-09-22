# PDFLoader Notes

# DAY 1

- PDFLoader = LangChain's tool to get text out of a PDF.
- PDF is not plain text (it has fonts, layout, etc.), so inside it uses a library called `pdf-parse` to read and extract text.

- When you call loader.load():
  1. opens the file from disk
  2. pdf-parse extracts the text
  3. splits it page by page (one page = one document, not all merged into one blob)
  4. returns an array, each item is a Document object

- Document structure:
  pageContent -> text of that page
  metadata -> source (file path) + loc.pageNumber (which page)

- why await?
  reading + parsing a file takes time (I/O + CPU work), load() returns a Promise, so we await it, otherwise the code would just move on without the data.

- why keep it page by page, not all text together?
  so later when a chunk is retrieved to answer something, we know which page it came from. useful for showing source ("found on page 5").

- interview one-liner:
  "I used PDFLoader to load a PDF and extract text, it uses pdf-parse internally. Each page comes back as its own Document object with the page number in metadata, so I can trace any retrieved chunk back to its source page."
