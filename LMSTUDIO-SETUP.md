# LM Studio Setup Guide

## Current Status
✅ LM Studio server is running on port 1234
❌ No chat model is loaded (only embedding model found)

## Step-by-Step Fix

### 1. Load a Chat Model in LM Studio

1. Open LM Studio
2. Go to the **"Discover"** or **"Models"** section to download models
3. Search for one of these recommended models:
   - **Mistral 7B Instruct** - Good balance of speed and quality
   - **Llama 2 7B Chat** - Meta's model, good for general chat
   - **Zephyr 7B Beta** - Fine-tuned for helpful responses
   - **Phi-2** - Smaller (2.7B), faster, good for testing

4. Click **Download** on your chosen model
5. Once downloaded, go to the **"Developer"** tab
6. In the Developer tab, select your downloaded model from the dropdown
7. Click **Load Model** or ensure it's loaded
8. Wait for the model to load (check the loading status)

### 2. Update Your .env File

Once you have a chat model loaded, update your `.env` file:

```bash
# Copy the working configuration
cp .env.fixed .env

# Edit the model name to match what you loaded
# The model name MUST match exactly what LM Studio shows
```

### 3. Test Again

Run the test script to verify everything works:

```bash
node test-lmstudio.js
```

You should see:
- ✅ Server connection successful
- ✅ Your chat model listed
- ✅ Test completion working

### 4. Common Model Names in LM Studio

Here are the exact names as they typically appear in LM Studio:

```
# Mistral models
TheBloke/Mistral-7B-Instruct-v0.2-GGUF
mistralai/Mistral-7B-Instruct-v0.2

# Llama models  
TheBloke/Llama-2-7B-Chat-GGUF
meta-llama/Llama-2-7b-chat-hf

# Zephyr models
TheBloke/zephyr-7B-beta-GGUF
HuggingFaceH4/zephyr-7b-beta

# Phi models
microsoft/phi-2
TheBloke/phi-2-GGUF
```

### 5. Recommended .env Configuration

For best results with this RAG demo:

```env
# Use LM Studio for chat (free, local)
AI_COMPLETION_PROVIDER=lmstudio
AI_COMPLETION_MODEL=TheBloke/Mistral-7B-Instruct-v0.2-GGUF

# Use OpenAI for embeddings (better quality)
AI_EMBEDDING_PROVIDER=openai
AI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_API_KEY=sk-your-key-here

# LM Studio endpoint
LMSTUDIO_BASE_URL=http://localhost:1234/v1
```

## Troubleshooting

### "Model not found" error
- The model name in .env doesn't match exactly
- Run `node test-lmstudio.js` to see the exact name

### "Connection refused" error  
- LM Studio isn't running
- Server isn't started (go to "Developer" tab → ensure "Start Server" is active)

### Slow responses
- Model is too large for your hardware
- Try a smaller model (Phi-2 or 7B models)
- Check GPU usage in LM Studio

### Want to use LM Studio for embeddings too?
Currently you have `text-embedding-nomic-embed-text-v1.5` loaded, but:
- LM Studio's embedding support is experimental
- The Vercel AI SDK might not support it well
- Recommended: Stick with OpenAI for embeddings