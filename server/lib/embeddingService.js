const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

async function embedText(text) {
  if (!text || text.trim().length === 0) return null;
  const truncated = text.slice(0, 2000);
  try {
    const result = await hf.featureExtraction({
      model: MODEL,
      inputs: truncated,
    });
    return Array.from(result);
  } catch (err) {
    console.error('[embeddingService] failed:', err.message);
    throw err;
  }
}

module.exports = { embedText, MODEL };
