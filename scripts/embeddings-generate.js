#!/usr/bin/env node

/**
 * Generate cached embeddings for a dataset.
 * Usage: node scripts/embeddings-generate.js <dataset-name>
 */

// Use tsx to handle TypeScript imports
require('tsx/cjs');
require('../dotenv-config.ts');
const { loadDocsWithChunking, embedAllDocsEnhanced } = require('../src/features/enhanced-semantic-search.ts');
const { getAIConfig } = require('../src/ai/provider-config.ts');
const path = require('node:path');
const fs = require('node:fs');

async function generateEmbeddings(datasetName) {
  if (!datasetName) {
    console.error('Usage: node scripts/embeddings-generate.js <dataset-name>');
    process.exit(1);
  }

  // Check if dataset exists
  const datasetPath = path.join(process.cwd(), 'data', datasetName);
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found: ${datasetName}`);
    console.error(`Expected path: ${datasetPath}`);
    process.exit(1);
  }

  console.log(`Generating embeddings for dataset: ${datasetName}`);

  try {
    // Validate AI configuration
    const config = getAIConfig();
    console.log(`Using ${config.embeddingProvider} with model: ${config.embeddingModel}`);

    // Load documents with chunking
    console.log('Loading documents...');
    const docs = await loadDocsWithChunking(datasetName);
    console.log(`Loaded ${docs.length} documents/chunks`);

    // Generate embeddings (with caching)
    console.log('Generating embeddings...');
    await embedAllDocsEnhanced(docs, datasetName);

    console.log('✅ Embeddings generation completed successfully');
  } catch (error) {
    console.error('❌ Error generating embeddings:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const datasetName = process.argv[2];
  generateEmbeddings(datasetName);
}

module.exports = { generateEmbeddings };