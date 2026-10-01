# vai-bhav-m.github.io

My portfolio site, live at **[vai-bhav-m.github.io](https://vai-bhav-m.github.io)**. React and
TypeScript on the front, Python at build time, and nothing in between — no server, no database,
no API keys, no monthly bill.

The point of the repo is the search. GitHub Pages only serves static files, so there is nowhere
to run a search backend. Instead a Python script reads the site's own Markdown content, splits
each project and role into chunks, and embeds every chunk with `all-MiniLM-L6-v2` at build time.
The resulting vectors are committed as a small JSON file. When a visitor searches, their browser
embeds the query locally with the ONNX export of that same model and ranks by cosine similarity
— which, because the vectors are normalised, is a plain dot product over 67 chunks. The work a
search server would have done either happens once ahead of time or runs on the visitor's own
machine, so the server has nothing left to do.

Search runs as two layers that fail in opposite directions. Keyword matching via MiniSearch is
instant and catches exact rare terms like `cozypose` or `tensorrt`; semantic matching catches
meaning, so "heart and medical scans" finds a cardiac segmentation project that shares no words
with the query. Keyword results render on the keystroke and semantic results merge in once the
model has loaded, which means search is never blank or broken while that happens — and if the
model never loads at all, the keyword layer still works.

Content lives as Markdown with YAML frontmatter under `content/`. React renders from those files
and the indexer reads the same ones, so the search index cannot drift from what is on the page.
All content access goes through `src/lib/content.ts`, which is the single seam where "where
content comes from" is decided — if this ever needs a real backend, that file changes and nothing
above it notices.

Everything deploys automatically: push to `main`, GitHub Actions builds, GitHub Pages publishes.
The embedding step deliberately stays out of CI, because installing PyTorch on every deploy would
add minutes and be the most fragile part of the pipeline. The index is regenerated locally with
`npm run build:index` and committed.

The full design rationale, the phased build plan, and the gotchas worth knowing are in
[`docs/`](docs/) — start with [`docs/README.md`](docs/README.md).
