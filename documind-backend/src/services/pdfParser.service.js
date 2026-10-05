const pdfParse = require('pdf-parse');

const CHUNK_SIZE = 800;       // characters per chunk
const CHUNK_OVERLAP = 150;    // overlap between consecutive chunks

/**
 * Extract raw text from a PDF buffer.
 */
async function extractText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
}

/**
 * Split text into overlapping chunks for embedding.
 */
function chunkText(text) {
  // Normalise whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length === 0) {
    throw new Error('PDF appears to be empty or unreadable. Scanned PDFs require OCR.');
  }

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunkText = cleaned.slice(start, end).trim();

    if (chunkText.length > 50) {  // skip very short trailing fragments
      chunks.push({
        text: chunkText,
        index: chunks.length,
      });
    }

    if (end === cleaned.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

module.exports = { extractText, chunkText };
