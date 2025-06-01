#!/usr/bin/env node

/**
 * Test script to verify LM Studio connection
 * Usage: node test-lmstudio.js
 */

// No need to import fetch, it's global in Node.js 18+

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';

async function testConnection() {
  console.log('Testing LM Studio connection...');
  console.log(`Base URL: ${LMSTUDIO_BASE_URL}`);
  console.log('');

  // Test 1: Check if server is running
  console.log('1. Testing server connection...');
  try {
    const response = await fetch(LMSTUDIO_BASE_URL, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) 
    });
    console.log(`   ✓ Server responded with status: ${response.status}`);
  } catch (error) {
    console.log(`   ✗ Failed to connect: ${error.message}`);
    console.log('\n   Make sure LM Studio is running and the local server is started.');
    console.log('   In LM Studio: Go to "Local Server" tab and click "Start Server"');
    return;
  }

  // Test 2: List available models
  console.log('\n2. Fetching available models...');
  try {
    const response = await fetch(`${LMSTUDIO_BASE_URL}/models`, {
      headers: {
        'Authorization': 'Bearer lm-studio',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log('   ✓ Available models:');
      data.data.forEach(model => {
        console.log(`     - ${model.id}`);
      });
      console.log('\n   Copy the exact model name to use in your .env file as AI_COMPLETION_MODEL');
    } else {
      console.log('   ✗ No models found. Load a model in LM Studio first.');
    }
  } catch (error) {
    console.log(`   ✗ Failed to fetch models: ${error.message}`);
  }

  // Test 3: Test chat completion
  console.log('\n3. Testing chat completion...');
  const modelToTest = process.env.AI_COMPLETION_MODEL || data?.data?.[0]?.id || 'test-model';
  
  try {
    const response = await fetch(`${LMSTUDIO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer lm-studio',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in 5 words or less.' }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`   ✓ Model responded: "${data.choices[0].message.content}"`);
    console.log(`   ✓ Model used: ${data.model}`);
  } catch (error) {
    console.log(`   ✗ Failed to complete chat: ${error.message}`);
    if (error.message.includes('model not found')) {
      console.log('   Make sure to load a model in LM Studio and use its exact name.');
    }
  }

  console.log('\n✅ Configuration tips:');
  console.log('1. Make sure LM Studio local server is running (check the "Local Server" tab)');
  console.log('2. Load a model in LM Studio before using it');
  console.log('3. Use the exact model name from the list above in your .env file');
  console.log('4. For embeddings, consider using OpenAI API instead of LM Studio');
}

// Load environment variables
require('dotenv').config();

// Run the test
testConnection().catch(console.error);