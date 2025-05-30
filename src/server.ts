import '../dotenv-config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { OpenAI } from 'openai';
import {
  loadDocs,
  embedAllDocs,
  findRelevantDocs,
} from './support/semantic-search';
import { htmlBody, escapeHtml } from './view/html';
import { stripFrontmatter } from './view/frontmatter';
import { loadSystemPrompt, loadUserTemplate, fillUserTemplate } from './dataset/template-loader';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import * as process from 'node:process';

// Discover available datasets
const dataDir = path.join(process.cwd(), 'data');
const dataSets = readdirSync(dataDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
// Cache for loaded documents and embeddings per dataset
const docsPromises: Record<string, Promise<any>> = {};
const docsEmbeddedPromises: Record<string, Promise<void>> = {};
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
// Home page: list datasets or show Ask UI
app.get('/', (c) => {
  const requestUrl = new URL(c.req.url, `http://localhost`);
  const dataParam = requestUrl.searchParams.get('data');
  if (!dataParam || !dataSets.includes(dataParam)) {
    const html = `
      <h1>Select dataset</h1>
      <ul>
        ${dataSets
          .map(
            (d) =>
              `<li><a href="/?data=${encodeURIComponent(d)}">${escapeHtml(
                d
              )}</a></li>`
          )
          .join('')}
      </ul>
    `;
    return c.html(htmlBody(html));
  }
  const html = `
    <h1>Ask a question (${escapeHtml(dataParam)})</h1>
    <form method="POST" action="/ask">
      <input type="hidden" name="data" value="${escapeHtml(dataParam)}" />
      <label>Question: <input name="question" type="text" required size="60"></label>
      <input type="submit" value="Ask">
    </form>
  `;
  return c.html(htmlBody(html));
});

// Redirect non-POST requests to /ask to /
app.get('/ask', (c) => {
  return c.redirect('/');
});

// Handle form submission and show answer
app.post('/ask', async (c) => {
  const body = await c.req.parseBody();
  const dataParam = typeof body['data'] === 'string' ? body['data'] : '';
  const question = typeof body['question'] === 'string' ? body['question'] : '';
  if (!dataParam || !dataSets.includes(dataParam)) {
    return c.html(htmlBody(`<p>Unknown dataset.</p><a href='/'>Back</a>`));
  }
  if (!question) {
    return c.html(
      htmlBody(
        `<p>No question submitted.</p><a href='/?data=${encodeURIComponent(
          dataParam
        )}'>Back</a>`
      )
    );
  }
  if (!docsPromises[dataParam]) {
    docsPromises[dataParam] = loadDocs(dataParam);
  }
  const docs = await docsPromises[dataParam];
  if (!docsEmbeddedPromises[dataParam]) {
    docsEmbeddedPromises[dataParam] = embedAllDocs(openai, docs, dataParam);
  }
  await docsEmbeddedPromises[dataParam];
  const relevantDocs = await findRelevantDocs(openai, docs, question, 2);
  const context = relevantDocs.map((d) => d.text).join('\n');

  const system = await loadSystemPrompt(dataParam);
  const template = await loadUserTemplate(dataParam);
  const user = fillUserTemplate(template, context, question);

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const answer = completion.choices[0]?.message.content || 'No answer.';
  function logToFile(message: string): void {
    const fs = require('fs');
    const timestamp = new Date().toISOString();
    const sanitized = message.replace(/\n{2,}/g, '\n');
    fs.appendFileSync('server.log', `${timestamp}\n${sanitized}\n`);
  }
  logToFile('OpenAI completion: ' + JSON.stringify(completion, null, 2));
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
  const debugJson = JSON.stringify(debugData, null, 2);
  const html = `
    <h1>Q: ${escapeHtml(question)}</h1>
    <h2>Answer:</h2>
    <blockquote>${escapeHtml(answer)}</blockquote>
    <h3>Top relevant passages:</h3>
    <ul>
      ${relevantDocs.map((d) => `<li>${escapeHtml(d.text)}</li>`).join('')}
    </ul>
    <form method="get" action="/?data=${encodeURIComponent(
      dataParam
    )}"><button>Ask another</button></form>
    <section>
      <h3>Debug Info</h3>
      <details>
        <summary>Request</summary>
        <pre style="white-space: pre-wrap;">${escapeHtml(debugJson)}</pre>
      </details>
      <h4>Context</h4>
      <details>
        <summary>System Prompt</summary>
        <pre style="white-space: pre-wrap;">${escapeHtml(system)}</pre>
      </details>
      <details>
        <summary>Documents</summary>
        <pre style="white-space: pre-wrap;">${escapeHtml(stripFrontmatter(await readFile(`${process.cwd()}/data/${dataParam}/docs.md`, 'utf-8')))}</pre>
      </details>
    </section>
  `;
  return c.html(htmlBody(html));
});

// Start server only when run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8787');
  serve({ fetch: app.fetch, port });
  console.log(`Listening on http://localhost:${port}`);
}
