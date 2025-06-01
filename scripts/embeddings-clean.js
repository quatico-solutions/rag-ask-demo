#!/usr/bin/env node

/**
 * Clean unused cached embeddings for a dataset.
 * Removes cache files that don't correspond to current document content.
 * Usage: node scripts/embeddings-clean.js <dataset-name>
 */

// Use tsx to handle TypeScript imports
require('tsx/cjs');
require('../dotenv-config.ts');
const { loadDocsWithChunking } = require('../src/features/enhanced-semantic-search.ts');
const { getAIConfig } = require('../src/ai/provider-config.ts');
const { createHash } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs').promises;

/**
 * Generate SHA256 hash of text content.
 * @param {string} text - The text content to hash
 * @returns {string} SHA256 hash as hexadecimal string
 */
function hashContent(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Generate a safe directory name from model identifier.
 * @param {string} model - Model identifier
 * @returns {string} Safe directory name
 */
function safeModelName(model) {
  return model.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/--+/g, '-');
}

async function cleanEmbeddings(datasetName) {
  if (!datasetName) {
    console.error('Usage: node scripts/embeddings-clean.js <dataset-name>');
    process.exit(1);
  }

  // Check if dataset exists
  const datasetPath = path.join(process.cwd(), 'data', datasetName);
  try {
    await fs.access(datasetPath);
  } catch {
    console.error(`Dataset not found: ${datasetName}`);
    console.error(`Expected path: ${datasetPath}`);
    process.exit(1);
  }

  console.log(`Cleaning unused embeddings for dataset: ${datasetName}`);

  try {
    // Validate AI configuration
    const config = getAIConfig();
    console.log(`Using ${config.embeddingProvider} with model: ${config.embeddingModel}`);

    // Load current documents with chunking
    console.log('Loading current documents...');
    const docs = await loadDocsWithChunking(datasetName);
    console.log(`Found ${docs.length} current documents/chunks`);

    // Get expected cache file names
    const expectedHashes = new Set(docs.map((doc) => hashContent(doc.text)));
    console.log(`Expected ${expectedHashes.size} cache files`);

    // Check current provider/model cache directory
    const embeddingsDir = path.join(datasetPath, 'embeddings');
    const cacheDir = path.join(embeddingsDir, config.embeddingProvider, safeModelName(config.embeddingModel));
    
    let existingFiles;
    try {
      existingFiles = await fs.readdir(cacheDir);
    } catch {
      console.log(`No cache directory found for ${config.embeddingProvider}/${config.embeddingModel} - nothing to clean`);
      return;
    }

    const cacheFiles = existingFiles.filter((file) => file.endsWith('.json'));
    console.log(`Found ${cacheFiles.length} existing cache files in ${config.embeddingProvider}/${config.embeddingModel}`);

    // Identify unused cache files
    const unusedFiles = [];
    for (const file of cacheFiles) {
      const hash = file.replace('.json', '');
      if (!expectedHashes.has(hash)) {
        unusedFiles.push(file);
      }
    }

    if (unusedFiles.length === 0) {
      console.log('✅ No unused cache files found');
      return;
    }

    console.log(`Found ${unusedFiles.length} unused cache files`);

    // Delete unused files
    for (const file of unusedFiles) {
      const filePath = path.join(cacheDir, file);
      await fs.unlink(filePath);
      console.log(`Deleted: ${file}`);
    }

    console.log(`✅ Cleaned ${unusedFiles.length} unused cache files from ${config.embeddingProvider}/${config.embeddingModel}`);
  } catch (error) {
    console.error('❌ Error cleaning embeddings:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const datasetName = process.argv[2];
  cleanEmbeddings(datasetName);
}

module.exports = { cleanEmbeddings };
