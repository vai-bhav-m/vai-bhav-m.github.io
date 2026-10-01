/**
 * Query embedding, in the browser.
 *
 * The documents were embedded at build time by ml/build_index.py. This handles
 * the other half: turning what the visitor typed into a comparable vector.
 *
 * See docs/05-search-design.md
 */

// ONNX export of sentence-transformers/all-MiniLM-L6-v2. The two produce
// compatible vectors, which is the thing the whole architecture rests on.
const MODEL = 'Xenova/all-MiniLM-L6-v2'

type Embedder = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>

let pipe: Promise<Embedder> | null = null

/**
 * Loads the model once per session.
 *
 * The import is dynamic on purpose. A static import pulls ~25 MB of library and
 * WASM into the main bundle and delays first paint for every visitor, including
 * the ones who never open search.
 */
export function getEmbedder(): Promise<Embedder> {
  if (!pipe) {
    pipe = import('@huggingface/transformers').then(({ pipeline }) =>
      // dtype 'q8' is the quantized build: ~25 MB instead of ~90 MB, with
      // negligible ranking difference at this corpus size.
      // (Older @xenova/transformers used { quantized: true } — different package.)
      pipeline('feature-extraction', MODEL, { dtype: 'q8' }),
    ) as Promise<Embedder>
  }
  return pipe
}

/** Embeds one short query to a unit-length 384-float vector. */
export async function embedQuery(query: string): Promise<Float32Array> {
  const embedder = await getEmbedder()
  const output = await embedder(query, { pooling: 'mean', normalize: true })
  return output.data
}

/** Kicks off the download without waiting — called when the overlay opens. */
export function warmUpEmbedder(): void {
  void getEmbedder().catch(() => {
    // Swallowed deliberately. If the model never loads, keyword search still
    // works; search() reports the failure through its own state.
  })
}
