#!/usr/bin/env node

/**
 * Clean unused cached embeddings for a dataset.
 * Removes cache files that don't correspond to current document content.
 * Usage: node scripts/embeddings-clean.js <dataset-name>
 */

// Use tsx to handle TypeScript imports
require('tsx/cjs');
const { loadDocs } = require('../src/support/semantic-search.ts');
const { createHash } = require('crypto');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate SHA256 hash of text content.
 * @param {string} text - The text content to hash
 * @returns {string} SHA256 hash as hexadecimal string
 */
function hashContent(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
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
    // Load current documents
    console.log('Loading current documents...');
    const docs = await loadDocs(datasetName);
    console.log(`Found ${docs.length} current documents`);

    // Get expected cache file names
    const expectedHashes = new Set(docs.map(doc => hashContent(doc.text)));
    console.log(`Expected ${expectedHashes.size} cache files`);

    // Check embeddings directory
    const embeddingsDir = path.join(datasetPath, 'embeddings');
    let existingFiles;
    try {
      existingFiles = await fs.readdir(embeddingsDir);
    } catch {
      console.log('No embeddings directory found - nothing to clean');
      return;
    }

    const cacheFiles = existingFiles.filter(file => file.endsWith('.json'));
    console.log(`Found ${cacheFiles.length} existing cache files`);

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
      const filePath = path.join(embeddingsDir, file);
      await fs.unlink(filePath);
      console.log(`Deleted: ${file}`);
    }

    console.log(`✅ Cleaned ${unusedFiles.length} unused cache files`);
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