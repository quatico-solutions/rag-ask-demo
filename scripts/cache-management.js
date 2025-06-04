#!/usr/bin/env node

/**
 * Cache Management Script
 * 
 * Utility for managing embedding caches across different providers and models.
 * Helps with cache cleanup, migration, and preparation of popular model caches.
 */

const { readdir, rm, mkdir, stat, copyFile } = require('fs/promises');
const path = require('path');

const CACHE_BASE_DIR = path.join(process.cwd(), 'data');

/**
 * List all cached embedding datasets and their providers/models
 */
async function listCaches() {
  console.log('📦 Embedding Cache Inventory\n');
  
  try {
    const datasets = await readdir(CACHE_BASE_DIR);
    
    for (const dataset of datasets) {
      const datasetPath = path.join(CACHE_BASE_DIR, dataset);
      const stat_ = await stat(datasetPath);
      
      if (!stat_.isDirectory()) continue;
      
      const embeddingsPath = path.join(datasetPath, 'embeddings');
      
      try {
        const providers = await readdir(embeddingsPath);
        console.log(`📁 ${dataset}/`);
        
        for (const provider of providers) {
          const providerPath = path.join(embeddingsPath, provider);
          const providerStat = await stat(providerPath);
          
          if (!providerStat.isDirectory()) continue;
          
          try {
            const models = await readdir(providerPath);
            
            for (const model of models) {
              const modelPath = path.join(providerPath, model);
              const modelStat = await stat(modelPath);
              
              if (!modelStat.isDirectory()) continue;
              
              try {
                const files = await readdir(modelPath);
                const jsonFiles = files.filter(f => f.endsWith('.json'));
                console.log(`  └── ${provider}/${model} (${jsonFiles.length} embeddings)`);
              } catch (err) {
                console.log(`  └── ${provider}/${model} (error reading)`);
              }
            }
          } catch (err) {
            console.log(`  └── ${provider}/ (error reading models)`);
          }
        }
        console.log();
      } catch (err) {
        console.log(`  └── No embeddings cache\n`);
      }
    }
  } catch (err) {
    console.log('❌ Error reading cache directory:', err.message);
  }
}

/**
 * Clear cache for specific dataset/provider/model
 */
async function clearCache(dataset, provider, model) {
  const basePath = path.join(CACHE_BASE_DIR, dataset, 'embeddings');
  
  let targetPath;
  let description;
  
  if (model && provider) {
    targetPath = path.join(basePath, provider, model);
    description = `${dataset}/${provider}/${model}`;
  } else if (provider) {
    targetPath = path.join(basePath, provider);
    description = `${dataset}/${provider}/*`;
  } else {
    targetPath = basePath;
    description = `${dataset}/*`;
  }
  
  try {
    await rm(targetPath, { recursive: true, force: true });
    console.log(`✅ Cleared cache: ${description}`);
  } catch (err) {
    console.log(`❌ Error clearing cache: ${err.message}`);
  }
}

/**
 * Copy cache from one model to another (useful for model migrations)
 */
async function copyCache(dataset, fromProvider, fromModel, toProvider, toModel) {
  const basePath = path.join(CACHE_BASE_DIR, dataset, 'embeddings');
  const fromPath = path.join(basePath, fromProvider, fromModel);
  const toPath = path.join(basePath, toProvider, toModel);
  
  try {
    // Ensure target directory exists
    await mkdir(path.dirname(toPath), { recursive: true });
    
    // Copy files
    const files = await readdir(fromPath);
    let copiedCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        await copyFile(path.join(fromPath, file), path.join(toPath, file));
        copiedCount++;
      }
    }
    
    console.log(`✅ Copied ${copiedCount} embeddings from ${fromProvider}/${fromModel} to ${toProvider}/${toModel}`);
  } catch (err) {
    console.log(`❌ Error copying cache: ${err.message}`);
  }
}

/**
 * Create prepared cache directories for popular models
 */
async function setupPopularModels(dataset) {
  const basePath = path.join(CACHE_BASE_DIR, dataset, 'embeddings');
  
  const popularModels = [
    // OpenAI models
    ['openai', 'text-embedding-ada-002'],
    ['openai', 'text-embedding-3-small'],
    ['openai', 'text-embedding-3-large'],
    
    // LM Studio / Local models
    ['lmstudio', 'all-MiniLM-L6-v2'],
    ['lmstudio', 'all-mpnet-base-v2'],
    ['lmstudio', 'sentence-transformers-all-MiniLM-L6-v2'],
    ['lmstudio', 'sentence-transformers-all-mpnet-base-v2']
  ];
  
  console.log(`📦 Setting up cache directories for popular models in ${dataset}/\n`);
  
  for (const [provider, model] of popularModels) {
    const modelPath = path.join(basePath, provider, model);
    
    try {
      await mkdir(modelPath, { recursive: true });
      console.log(`✅ Created: ${provider}/${model}/`);
    } catch (err) {
      console.log(`❌ Error creating ${provider}/${model}/: ${err.message}`);
    }
  }
  
  console.log(`\n📝 To prepare caches for these models, run embeddings generation with each model configuration.`);
}

// CLI interface
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  console.log('🗂️  Embedding Cache Management\n');
  
  switch (command) {
    case 'list':
      await listCaches();
      break;
      
    case 'clear':
      const [dataset, provider, model] = args;
      if (!dataset) {
        console.log('Usage: node cache-management.js clear <dataset> [provider] [model]');
        console.log('Examples:');
        console.log('  node cache-management.js clear example-fruits');
        console.log('  node cache-management.js clear example-fruits openai');
        console.log('  node cache-management.js clear example-fruits openai text-embedding-ada-002');
        process.exit(1);
      }
      await clearCache(dataset, provider, model);
      break;
      
    case 'copy':
      const [copyDataset, fromProvider, fromModel, toProvider, toModel] = args;
      if (!copyDataset || !fromProvider || !fromModel || !toProvider || !toModel) {
        console.log('Usage: node cache-management.js copy <dataset> <from-provider> <from-model> <to-provider> <to-model>');
        console.log('Example: node cache-management.js copy example-fruits openai text-embedding-ada-002 lmstudio all-MiniLM-L6-v2');
        process.exit(1);
      }
      await copyCache(copyDataset, fromProvider, fromModel, toProvider, toModel);
      break;
      
    case 'setup':
      const [setupDataset] = args;
      if (!setupDataset) {
        console.log('Usage: node cache-management.js setup <dataset>');
        console.log('Example: node cache-management.js setup example-fruits');
        process.exit(1);
      }
      await setupPopularModels(setupDataset);
      break;
      
    default:
      console.log('Available commands:');
      console.log('  list                                    - List all cached embeddings');
      console.log('  clear <dataset> [provider] [model]     - Clear cache (specific or all)');
      console.log('  copy <dataset> <from> <to>              - Copy cache between models');
      console.log('  setup <dataset>                         - Create directories for popular models');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/cache-management.js list');
      console.log('  node scripts/cache-management.js clear example-fruits');
      console.log('  node scripts/cache-management.js setup example-fruits');
      break;
  }
}

main().catch(console.error);