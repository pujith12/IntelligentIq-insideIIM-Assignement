import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

// Verify API Key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn('[Embeddings Service] WARNING: GEMINI_API_KEY is not configured in .env file.');
}

/**
 * Initializes and returns a Google GenAI Embeddings instance.
 * Model used is 'text-embedding-004' which yields 768 dimensions.
 */
export const getEmbeddingsInstance = () => {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'embedding-001',
  });
};

export default getEmbeddingsInstance;
