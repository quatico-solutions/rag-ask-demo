#!/usr/bin/env node

/**
 * Update cached embeddings for a dataset.
 * Generates embeddings for new/changed documents, then cleans unused cache files.
 * Usage: node scripts/embeddings-update.js <dataset-name>
 */

const { generateEmbeddings } = require('./embeddings-generate');
const { cleanEmbeddings } = require('./embeddings-clean');

async function updateEmbeddings(datasetName) {
  if (!datasetName) {
    console.error('Usage: node scripts/embeddings-update.js <dataset-name>');
    process.exit(1);
  }

  console.log(`Updating embeddings for dataset: ${datasetName}`);
  console.log('=====================================');

  try {
    // Step 1: Generate embeddings for any new/changed documents
    console.log('Step 1: Generating embeddings...');
    await generateEmbeddings(datasetName);
    
    console.log('\nStep 2: Cleaning unused cache files...');
    await cleanEmbeddings(datasetName);

    console.log('\n✅ Embeddings update completed successfully');
  } catch (error) {
    console.error('❌ Error updating embeddings:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const datasetName = process.argv[2];
  updateEmbeddings(datasetName);
}

module.exports = { updateEmbeddings };