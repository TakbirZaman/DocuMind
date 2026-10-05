const OpenAI = require('openai');

const BATCH_SIZE = 20;
const EMBEDDING_MODEL = 'text-embedding-3-small';

let client;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Embed a single string (used for query embedding at chat time).
 */
async function embedQuery(text) {
  const openai = getClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8192),
  });
  return response.data[0].embedding;
}

/**
 * Embed an array of chunks in batches of BATCH_SIZE.
 * Returns the same array with an `embedding` field added to each chunk.
 */
async function embedChunks(chunks) {
  const openai = getClient();
  const results = [...chunks];

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.text.slice(0, 8192));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    response.data.forEach((item, j) => {
      results[i + j].embedding = item.embedding;
    });

    // Respect rate limits on large documents
    if (i + BATCH_SIZE < results.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

module.exports = { embedQuery, embedChunks };
