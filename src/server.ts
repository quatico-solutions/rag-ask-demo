import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { OpenAI } from 'openai';
import { docs, embedAllDocs, findRelevantDocs } from './support/semanticSearch';
import * as process from 'process';

const app = new Hono();

// Init OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let docsEmbeddedPromise: Promise<void> | null = null;

function htmlBody(inner: string): string {
  return `<!doctype html>\n<html><head><meta charset='utf-8'><title>RAG Ask</title></head><body>${inner}</body></html>`;
}

// Render the form
app.get('/', (c) => {
  const html = `
    <h1>Ask a question (Semantic search & retrieval)</h1>
    <form method="POST" action="/ask">
      <label>Question: <input name="question" type="text" required size="60"></label>
      <input type="submit" value="Ask">
    </form>
  `;
  return c.html(htmlBody(html));
});

// Handle form submission and show answer
app.post('/ask', async (c) => {
  const body = await c.req.parseBody();
  const question = typeof body['question'] === 'string' ? body['question'] : '';
  if (!question) {
    return c.html(
      htmlBody("<p>No question submitted.</p><a href='/'>Back</a>")
    );
  }

  // Embed documents on first request
  if (!docsEmbeddedPromise) {
    docsEmbeddedPromise = embedAllDocs(openai, docs);
  }
  await docsEmbeddedPromise;

  // Retrieve
  const relevantDocs = await findRelevantDocs(openai, docs, question, 2);
  const context = relevantDocs.map((d) => d.text).join('\n');

  // Call OpenAI chat completions with context
  const system =
    'You are a helpful assistant. Use the following context to answer if relevant.';
  const user = `Context:\n${context}\n\nQuestion: ${question}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const answer = completion.choices[0]?.message.content || 'No answer.';

  // Prepare debug information
  const debugData = {
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    },
    context,
    relevantDocs: relevantDocs.map(d => ({ id: d.id, text: d.text })),
    completion,
  };
  const debugJson = JSON.stringify(debugData, null, 2);

  // Render page with question, answer, relevant docs, and debug UI
  const html = `
    <h1>Q: ${escapeHtml(question)}</h1>
    <h2>Answer:</h2>
    <blockquote>${escapeHtml(answer)}</blockquote>
    <h3>Top relevant passages:</h3>
    <ul>
    ${relevantDocs.map((d) => `<li>${escapeHtml(d.text)}</li>`).join('')}
    </ul>
    <form method='get' action='/'><button>Ask another</button></form>
    <details>
      <summary>Debug Info</summary>
      <pre style="white-space: pre-wrap;">${escapeHtml(debugJson)}</pre>
    </details>
  `;
  return c.html(htmlBody(html));
});

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (s) => {
    switch (s) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return s;
    }
  });
}

// Start server only when run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8787');
  serve({ fetch: app.fetch, port });
  console.log(`Listening on http://localhost:${port}`);
}
