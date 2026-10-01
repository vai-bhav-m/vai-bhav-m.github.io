# Glossary

Terms used in these docs, defined in the sense they're used here. Skim it once; come
back when a word in another doc doesn't land.

## Web basics

**Static site** — a site made of files (HTML, CSS, JS, images) that a server hands over
unchanged. No code runs on the server. Yours is one.

**Dynamic site** — a site where a server runs code per request to build the response.
Flask apps are dynamic. GitHub Pages cannot host one.

**Client-side / server-side** — where code runs. Client-side is the visitor's browser;
server-side is a machine you control. Anything client-side is visible to anyone who
looks, which is why secrets can never live there.

**Build** — the step that turns your source (TypeScript, JSX, Markdown, Tailwind) into
plain files a browser understands. `npm run build`, output in `dist/`.

**Bundle** — the JavaScript file(s) the build produces. Smaller is better; every byte
is a download before the page works.

**Code splitting** — breaking the bundle into pieces loaded on demand. It's why the
25 MB embedding model doesn't slow down visitors who never search.

**Lazy loading** — deferring a download until it's needed. A dynamic `import()`
triggers it.

**CDN** — a network of servers distributing files from a location near the visitor.
GitHub Pages uses one, which is why a static site is fast worldwide for free.

**Cold start** — the delay when a sleeping server wakes to handle a request. Free
backend tiers sleep after idling; 30–50 seconds is typical. The main reason this
architecture has no backend.

**CORS** — browser rules about which sites may make requests to which other sites. Not
relevant while everything is one origin; becomes relevant the day Flask appears.

## Frontend

**React** — a library for building UIs from components. You describe what the UI should
look like for a given state; React updates the DOM.

**Component** — a reusable piece of UI, written as a function returning markup.
`ProjectCard.tsx` is one.

**JSX / TSX** — the HTML-like syntax inside React components. TSX is JSX with
TypeScript.

**Props** — inputs passed into a component, like function arguments.

**State** — data a component holds that can change, causing a re-render.

**Vite** — the build tool and dev server. Replaced Create React App, which is
deprecated.

**HMR (Hot Module Replacement)** — the dev server swapping changed code into the
running page without a reload, usually preserving your scroll position and state.

**Tailwind CSS** — styling via small utility classes in your markup
(`class="text-xl font-bold"`) instead of a separate stylesheet.

**Frontmatter** — the `---`-delimited YAML block at the top of a Markdown file, holding
structured data (title, tags, dates) alongside prose.

**DOM** — the browser's live tree of page elements. React manipulates it for you.

**IntersectionObserver** — a browser API that tells you when an element enters or
leaves the viewport, without the performance cost of a scroll listener. Powers
scroll-spy.

**`prefers-color-scheme`** — the CSS media query exposing the visitor's OS light/dark
setting.

**localStorage** — a small key-value store in the browser, per site, that survives
page loads. Holds the theme override. Not shared across devices and not visible to you.

**FOUC** — "flash of unstyled content". Here specifically: the white flash before a
dark theme applies, if the theme is decided too late.

**Focus trap** — keeping keyboard focus inside an open modal so Tab doesn't wander onto
the page behind it. An accessibility requirement for the search overlay.

## Search and ML

**Embedding** — a list of numbers (a vector) representing a piece of text, arranged so
texts with similar meanings produce nearby vectors. The core idea behind semantic
search.

**Vector** — an ordered list of numbers. Yours have 384 of them.

**Dimensions** — how many numbers in the vector. `all-MiniLM-L6-v2` produces 384.

**Embedding model** — the model that turns text into a vector. Not a chatbot; it
produces numbers, not sentences.

**Semantic search** — ranking by meaning, via embedding similarity. Finds "computer
vision" for the query "images".

**Keyword / lexical search** — ranking by word overlap. Finds exact terms and tolerates
typos, but not synonyms. What MiniSearch does.

**Cosine similarity** — a measure of how aligned two vectors are, from -1 to 1. For
unit-length vectors it's identical to the dot product, which is why we normalize at
build time.

**Dot product** — multiply matching elements of two vectors, sum the results. The whole
of the runtime search math.

**Normalization** — scaling a vector to length 1. Doing it at build time makes the
runtime comparison a plain dot product.

**Token** — roughly a word-piece; how models count text length. `all-MiniLM-L6-v2` caps
at 256 tokens (~190 words) and silently truncates past that.

**Chunking** — splitting a long document into smaller indexable pieces. **Deliberately
not used here** — you index one vector per project instead, which avoids the
truncation trap entirely.

**Quantization** — storing model weights at lower precision to shrink them. `q8` is
what makes the browser model ~25 MB instead of ~90 MB, at negligible quality cost.

**ONNX** — a portable model format. It's what lets the same model run in a browser that
was trained in PyTorch.

**transformers.js** — the library running ONNX models in a browser.
`@huggingface/transformers`. Note the older `@xenova/transformers` has a different API,
which is why old tutorials mislead.

**sentence-transformers** — the Python library used at build time to produce the
vectors.

**Vector database** — storage optimised for nearest-neighbour search over many vectors.
**Not used here** — 25 vectors is a `for` loop.

## Tooling

**npm** — Node's package manager. `npm install` adds dependencies, `npm run <script>`
runs a script from `package.json`.

**`npm ci`** — installs exactly what's in the lockfile. Used in CI so builds are
reproducible.

**Lockfile** (`package-lock.json`) — pins the exact resolved version of every
dependency. Commit it.

**venv** — an isolated Python environment per project, so packages don't collide
system-wide. `.venv/` is gitignored.

**CI / CI/CD** — automation that builds and deploys on push. Yours is GitHub Actions.

**GitHub Actions** — GitHub's CI. Defined in YAML under `.github/workflows/`.

**Workflow / job / step** — an Actions file is a workflow, containing jobs, each
containing steps. Jobs can run in parallel; steps run in order.

**Artifact** — a file produced by a CI job and passed to another. Your `dist/` folder
goes from the build job to the deploy job as one.

**Repository secret** — an encrypted value available to Actions but not to the built
site. Where an API key would live, the day Flask exists.
