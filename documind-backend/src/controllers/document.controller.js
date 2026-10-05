const Document = require('../models/Document');
const { extractText, chunkText } = require('../services/pdfParser.service');
const { embedChunks } = require('../services/embedding.service');

/**
 * POST /api/documents/upload
 * Accepts a PDF file, extracts text, chunks it, embeds, and stores.
 */
async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided.' });
    }

    const { buffer, originalname } = req.file;

    // 1. Extract text from PDF
    const { text, pageCount } = await extractText(buffer);

    // 2. Chunk the text
    const rawChunks = chunkText(text);

    if (rawChunks.length === 0) {
      return res.status(422).json({ error: 'No readable text found in PDF.' });
    }

    // 3. Embed chunks via OpenAI
    const embeddedChunks = await embedChunks(rawChunks);

    // 4. Save to MongoDB
    const doc = await Document.create({
      filename: originalname,
      originalName: originalname,
      pageCount,
      charCount: text.length,
      chunks: embeddedChunks,
    });

    return res.status(201).json({
      message: 'Document processed and vectorized successfully',
      documentId: doc._id.toString(),
      filename: originalname,
      pageCount,
      chunksCreated: embeddedChunks.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/documents
 * Returns all documents (metadata only, no chunks).
 */
async function listDocuments(req, res) {
  try {
    const docs = await Document.find({}, {
      filename: 1,
      originalName: 1,
      pageCount: 1,
      charCount: 1,
      uploadedAt: 1,
      chunkCount: { $size: '$chunks' },
    }).sort({ uploadedAt: -1 }).lean();

    // Manually compute chunk count since $size in projection doesn't work in all versions
    const enriched = docs.map(d => ({
      ...d,
      chunksCreated: d.chunks ? d.chunks.length : 0,
      chunks: undefined, // don't send embeddings
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('List error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/documents/:id
 */
async function deleteDocument(req, res) {
  try {
    const result = await Document.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    return res.json({ message: 'Document deleted.', documentId: req.params.id });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { uploadDocument, listDocuments, deleteDocument };
