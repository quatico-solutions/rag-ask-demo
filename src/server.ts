import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { OpenAI } from 'openai';
import {
  loadDocs,
  embedAllDocs,
  findRelevantDocs,
} from './support/semanticSearch';
import { htmlBody, escapeHtml } from './view/html';
import { stripFrontmatter } from './support/frontmatter';
import { readFile } from 'fs/promises';
import * as process from 'process';

// Load prompt templates and documents from data files
const systemPromptPromise = readFile(
  `${process.cwd()}/data/example-nodejs/system-prompt.md`,
  'utf-8'
);
const userTemplatePromise = readFile(
  `${process.cwd()}/data/example-nodejs/user-template.md`,
  'utf-8'
);
const docsPromise = loadDocs();
// Mock OpenAI for testing
class MockOpenAI {
  embeddings = {
    create: async ({ input }: any) => {
      const length = Array.isArray(input) ? input.length : 1;
      const embedding = Array(length).fill(1);
      return { data: [{ embedding }] };
    },
  };
  chat = {
    completions: {
      create: async ({ messages }: any) => {
        return { choices: [{ message: { content: 'Hello from mock' } }] };
      },
    },
  };
}

const app = new Hono();

// Init OpenAI client (real or mock for tests)
const openai =
  process.env.USE_MOCK_OPENAI === 'true'
    ? new MockOpenAI()
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let docsEmbeddedPromise: Promise<void> | null = null;

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

  // Load and embed documents on first request
  const docs = await docsPromise;
  if (!docsEmbeddedPromise) {
    docsEmbeddedPromise = embedAllDocs(openai, docs);
  }
  await docsEmbeddedPromise;

  // Retrieve
  const relevantDocs = await findRelevantDocs(openai, docs, question, 2);
  const context = relevantDocs.map((d) => d.text).join('\n');

  // Prepare prompts from external templates and strip YAML headers
  const rawSystem = await systemPromptPromise;
  const system = stripFrontmatter(rawSystem);
  const rawTemplate = await userTemplatePromise;
  const template = stripFrontmatter(rawTemplate);
  const user = template
    .replace('{{context}}', context)
    .replace('{{question}}', question);

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  console.log('OpenAI completion:', JSON.stringify(completion, null, 2));
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
    relevantDocs: relevantDocs.map((d) => ({ id: d.id, text: d.text })),
    completion,
  };

  // Logging Utility
  function logToFile(message: string): void {
    const fs = require('fs');
    const timestamp = new Date().toISOString();
    const sanitized = message.replace(/\n{2,}/g, '\n');
    const formattedMessage = `${timestamp}\n${sanitized}\n`;
    fs.appendFileSync('server.log', formattedMessage);
  }

  // Example usage of logToFile
  logToFile('OpenAI completion: ' + JSON.stringify(completion, null, 2));

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

// Start server only when run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8787');
  serve({ fetch: app.fetch, port });
  console.log(`Listening on http://localhost:${port}`);
}
