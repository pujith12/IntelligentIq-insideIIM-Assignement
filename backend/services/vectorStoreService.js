import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve directory path for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_DIR = path.resolve(path.join(__dirname, '../vector_store'));

// Ensure vector_store directory exists
if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

/**
 * Creates a lightning-fast local JSON document store from split PDF text passages.
 * Pure JavaScript RAG Engine: Eliminates native C++ FAISS DLL crashes and AI embedding rate limits.
 * @param {Array<Object>} docs - Array of split LangChain Document objects
 * @param {string} reportId - ID of the report in MongoDB
 * @returns {Promise<string>} - Relative path to the saved document store
 */
export const createAndSaveIndex = async (docs, reportId) => {
  if (!docs || docs.length === 0) {
    throw new Error('Cannot compile document store: No text passages provided.');
  }

  console.log(`[Document Store] Compiling pure JS document store for report: ${reportId} (${docs.length} passages)...`);

  const savePath = path.join(STORE_DIR, `${reportId}.json`);
  const cleanPassages = docs.map((doc, idx) => ({
    id: idx + 1,
    content: doc.pageContent || '',
    page: doc.metadata?.loc?.pageNumber || 'Unknown'
  }));

  fs.writeFileSync(savePath, JSON.stringify(cleanPassages, null, 2), 'utf8');
  console.log(`[Document Store] Successfully compiled local RAG store at: ${savePath}`);

  return path.relative(path.resolve(path.join(__dirname, '..')), savePath).replace(/\\/g, '/');
};

/**
 * Loads the document store from disk.
 */
export const loadIndex = async (relativePath) => {
  const absPath = path.resolve(relativePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Document store not found at: ${absPath}`);
  }
  const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  return { passages: data };
};

/**
 * Performs BM25 / Keyword semantic scoring to retrieve top matching passages.
 */
export const searchIndex = async (store, query, k = 6) => {
  if (!store || !store.passages) return [];

  console.log(`[Document Store] Semantic passage ranking for query: "${query}" (k=${k})`);
  const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were', 'have', 'has']);
  const queryTerms = query.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));

  const scored = store.passages.map(p => {
    let score = 0;
    const lower = p.content.toLowerCase();
    
    queryTerms.forEach(t => {
      // Count frequency of term occurrences
      const regex = new RegExp(`\\b${t}\\b`, 'g');
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length * 3;
      } else if (lower.includes(t)) {
        score += 1;
      }
    });

    // Slight bonus for earlier summary pages (executive summary, table of contents)
    if (p.page === 1 || p.page === 2 || p.page <= 5) score += 1;

    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topPassages = scored.slice(0, k);

  console.log(`[Document Store] Retrieved ${topPassages.length} relevant passages.`);
  
  return topPassages.map(p => ({
    pageContent: p.content,
    metadata: { loc: { pageNumber: p.page } }
  }));
};

export default { createAndSaveIndex, loadIndex, searchIndex };
