const OpenAI = require('openai');

let client;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are DocuMind, a precise document analysis assistant.
Answer questions strictly based on the provided document context.
- Be direct and factual. Cite relevant parts of the context.
- If the context doesn't contain enough information, say so clearly.
- Use markdown for structure when it helps readability.
- Never fabricate information not present in the context.`;

/**
 * Stream a RAG-grounded answer via Server-Sent Events.
 * @param {string} question - The user's question.
 * @param {string[]} contextChunks - Relevant text chunks from vector search.
 * @param {object} res - Express response object (SSE stream).
 */
async function streamAnswer(question, contextChunks, res) {
  const openai = getClient();

  const contextText = contextChunks
    .map((c, i) => `[Context ${i + 1}]\n${c}`)
    .join('\n\n');

  const userMessage = `Document context:\n${contextText}\n\nQuestion: ${question}`;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = openai.beta.chat.completions.stream({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

module.exports = { streamAnswer };
