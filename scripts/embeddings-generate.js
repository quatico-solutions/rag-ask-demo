#!/usr/bin/env node

/**
 * Generate cached embeddings for a dataset.
 * Usage: node scripts/embeddings-generate.js <dataset-name>
 */

// Use tsx to handle TypeScript imports
require('tsx/cjs');
const { loadDocs, embedAllDocs } = require('../src/support/semantic-search.ts');
const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');

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

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`Generating embeddings for dataset: ${datasetName}`);

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Load documents
    console.log('Loading documents...');
    const docs = await loadDocs(datasetName);
    console.log(`Loaded ${docs.length} documents`);

    // Generate embeddings (with caching)
    console.log('Generating embeddings...');
    await embedAllDocs(openai, docs, datasetName);

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