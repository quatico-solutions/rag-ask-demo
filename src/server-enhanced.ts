import '../dotenv-config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readdirSync } from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { getAIConfig } from './ai/provider-config';
import { generateRAGResponse } from './ai/completions';
import {
  semanticSearchEnhanced,
  type SearchConfig,
  type ScoredDoc,
} from './features/enhanced-semantic-search';
import { loadSystemPrompt } from './dataset/template-loader';
import { escapeHtml, htmlBody } from './view/html';

const app = new Hono();

const dataDir = path.join(process.cwd(), 'data');
const dataSets = readdirSync(dataDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const searchCache: Record<string, Promise<ScoredDoc[]>> = {};

app.get('/', async (c) => {
  const dataParam = c.req.query('data');
  const selectedData = dataParam && dataSets.includes(dataParam) ? dataParam : dataSets[0];

  const html = `
    <h1>Enhanced RAG Demo</h1>
    <p>Ask a question about the dataset (now with intelligent chunking and hybrid search):</p>
    <form action="/ask" method="post">
      <label for="data">Dataset:</label>
      <select name="data" id="data" onchange="this.form.action='/?data=' + this.value; this.form.method='get'; this.form.submit();">
        ${dataSets
          .map(
            (d) =>
              `<option value="${escapeHtml(d)}"${
                d === selectedData ? ' selected' : ''
              }>${escapeHtml(d)}</option>`
          )
          .join('\n')}
      </select>
      <br>
      <label for="question">Question:</label>
      <input type="text" name="question" id="question" required>
      <br>
      <label for="enableHybrid">
        <input type="checkbox" name="enableHybrid" id="enableHybrid" value="true" checked>
        Enable Hybrid Search (combine embeddings with keyword matching)
      </label>
      <br>
      <label for="maxResults">Max Results:</label>
      <input type="number" name="maxResults" id="maxResults" value="3" min="1" max="10">
      <br>
      <button type="submit">Ask</button>
    </form>
  `;
  return c.html(htmlBody(html));
});

app.get('/ask', (c) => {
  return c.redirect('/');
});

app.post('/ask', async (c) => {
  const body = await c.req.parseBody();
  const dataParam = typeof body['data'] === 'string' ? body['data'] : '';
  const question = typeof body['question'] === 'string' ? body['question'] : '';
  const enableHybrid = body['enableHybrid'] === 'true';
  const maxResults = parseInt(typeof body['maxResults'] === 'string' ? body['maxResults'] : '3', 10);

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

  // Search configuration
  const searchConfig: SearchConfig = {
    maxResults,
    enableHybridSearch: enableHybrid,
    embeddingWeight: 0.7,
    maxTokensPerChunk: 500,
    overlapTokens: 100,
    preserveSentences: true,
  };

  // Create cache key
  const cacheKey = `${dataParam}-${question}-${JSON.stringify(searchConfig)}`;

  // Perform enhanced semantic search with caching
  if (!searchCache[cacheKey]) {
    searchCache[cacheKey] = semanticSearchEnhanced(dataParam, question, searchConfig);
  }

  const searchResults = await searchCache[cacheKey];
  
  // Extract context from search results
  const context = searchResults.map((result) => {
    // If it's a chunk, add metadata about which document and chunk
    if (result.metadata?.isChunk) {
      return `[Document ${result.metadata.documentId}, Chunk ${(result.metadata.chunkIndex ?? 0) + 1}/${result.metadata.totalChunks}]\n${result.text}`;
    }
    return result.text;
  });

  // Generate response
  const system = await loadSystemPrompt(dataParam);
  const answer = await generateRAGResponse(question, context, {
    systemPrompt: system,
  });

  const aiConfig = getAIConfig();

  // Build results HTML
  let resultsHtml = `
    <h1>Answer</h1>
    <p><strong>Question:</strong> ${escapeHtml(question)}</p>
    <p><strong>Answer:</strong> ${escapeHtml(answer)}</p>
    
    <h2>Retrieved Context</h2>
    <p>Found ${searchResults.length} relevant chunks/documents:</p>
    <ol>
  `;

  for (const result of searchResults) {
    resultsHtml += `
      <li>
        <strong>Score: ${result.score.toFixed(3)}</strong>
        ${result.metadata?.isChunk ? 
          `(Doc ${result.metadata.documentId}, Chunk ${(result.metadata.chunkIndex ?? 0) + 1}/${result.metadata.totalChunks})` : 
          `(Doc ${result.id})`
        }
        <br>
        ${result.highlights && result.highlights.length > 0 ? 
          `<em>Highlights:</em> ${result.highlights.map(h => escapeHtml(h)).join(' ... ')}<br>` : 
          ''
        }
        <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; margin: 10px 0;">
${escapeHtml(result.text)}
        </pre>
      </li>
    `;
  }

  resultsHtml += `
    </ol>
    
    <h2>Search Configuration</h2>
    <ul>
      <li>Hybrid Search: ${enableHybrid ? 'Enabled' : 'Disabled'}</li>
      <li>Max Results: ${maxResults}</li>
      <li>Embedding Weight: ${searchConfig.embeddingWeight}</li>
      <li>Chunk Size: ~${searchConfig.maxTokensPerChunk} tokens</li>
      <li>Overlap: ${searchConfig.overlapTokens} tokens</li>
    </ul>
    
    <details>
      <summary>Debug Information</summary>
      <pre>${escapeHtml(JSON.stringify({
        aiConfig: {
          completionProvider: aiConfig.completionProvider,
          completionModel: aiConfig.completionModel,
          embeddingProvider: aiConfig.embeddingProvider,
          embeddingModel: aiConfig.embeddingModel,
        },
        searchConfig,
        contextLength: context.join('\n').length,
        resultsMetadata: searchResults.map(r => ({
          id: r.id,
          score: r.score,
          textLength: r.text.length,
          metadata: r.metadata,
        })),
      }, null, 2))}</pre>
    </details>
    
    <a href="/?data=${encodeURIComponent(dataParam)}">Ask another question</a>
  `;

  return c.html(htmlBody(resultsHtml));
});

const port = 8787;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});