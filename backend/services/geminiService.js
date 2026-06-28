import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

// Verify API Key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn('[Gemini Service] WARNING: GEMINI_API_KEY is not configured in .env file.');
}

/**
 * Initializes and returns a ChatGoogleGenerativeAI (Gemini 2.5 Flash) instance.
 * Temperature is set low (0.1) for rigorous financial analysis and minimum hallucination.
 */
export const getLLMInstance = () => {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-2.5-flash',
    temperature: 0.1,
    maxOutputTokens: 8192,
  });
};

export default getLLMInstance;
