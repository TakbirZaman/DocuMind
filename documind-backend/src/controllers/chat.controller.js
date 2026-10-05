const mongoose = require('mongoose');
const Document = require('../models/Document');
const { embedQuery } = require('../services/embedding.service');
const { streamAnswer } = require('../services/llm.service');

/**
 * Cosine similarity between two equal-length vectors.
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

/**
 * Find top-K most relevant chunks using in-memory cosine similarity.
 * For documents < ~500 chunks this is fast enough.
 * For production scale, replace with native $vectorSearch (see README Step 5).
 */
function findTopChunks(chunks, queryEmbedding, topK = 5) {
  const scored = chunks.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(chunk.embedding, queryEmbedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(c => c.text);
}

/**
 * POST /api/chat
 * Body: { documentId: string, question: string }
 * Streams SSE tokens back to the client.
 */
async function chat(req, res) {
  const { documentId, question } = req.body;

  if (!documentId || !question) {
    return res.status(400).json({ error: 'documentId and question are required.' });
  }

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ error: 'Invalid documentId.' });
  }

  try {
    // 1. Fetch the document (with embeddings)
    const doc = await Document.findById(documentId).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!doc.chunks || doc.chunks.length === 0) {
      return res.status(422).json({ error: 'Document has no indexed chunks.' });
    }

    // 2. Embed the question
    const queryEmbedding = await embedQuery(question);

    // 3. Vector search (in-memory cosine similarity)
    const topChunks = findTopChunks(doc.chunks, queryEmbedding, 5);

    // 4. Stream the LLM answer
    await streamAnswer(question, topChunks, res);
  } catch (err) {
    console.error('Chat error:', err);
    // If headers already sent (streaming started), we can't send a JSON error
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = { chat };
