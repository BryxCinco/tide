const MODEL = 'Xenova/all-MiniLM-L6-v2';

// Runs fully on this server — no HuggingFace API credits spent per call. @xenova/transformers
// is ESM-only, so it's loaded via a dynamic import() from this CommonJS file; the pipeline
// itself downloads its ONNX weights once (cached under server/.cache by default) and is
// reused for every embedText() call after that first one.
let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', MODEL);
    })();
  }
  return extractorPromise;
}

async function embedText(text) {
  if (!text || text.trim().length === 0) return null;
  const truncated = text.slice(0, 2000);
  try {
    const extractor = await getExtractor();
    // mean pooling + normalize matches what the old sentence-transformers/all-MiniLM-L6-v2
    // HuggingFace endpoint returned — same 384-dim vector space as what's already stored in
    // the embeddings table, so no backfill/migration is needed to switch over.
    const output = await extractor(truncated, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error('[embeddingService] failed:', err.message);
    throw err;
  }
}

module.exports = { embedText, MODEL };
