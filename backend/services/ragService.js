import { loadIndex, searchIndex } from './vectorStoreService.js';
import { searchWeb } from './webSearchService.js';

/**
 * Orchestrates context retrieval for the investment engine.
 * Combines local document chunks (RAG) and the latest web search findings.
 * @param {string} companyName - Name of the company (e.g. 'TESLA')
 * @param {string} query - The search query/prompt focus
 * @param {Object} reportMetadata - MongoDB Report document if it exists (optional)
 * @returns {Promise<Object>} - Aggregated context data
 */
export const getResearchContext = async (companyName, query, reportMetadata) => {
  const company = companyName.toUpperCase().trim();
  let documentContext = 'No uploaded annual reports or earnings documents available for this company.';
  let newsContext = 'No web news available.';
  let retrievedDocs = [];

  console.log(`[RAG Service] Starting context retrieval for ${company}...`);

  try {
    // 1. Fetch Document Context from FAISS if a report exists
    if (reportMetadata && reportMetadata.vectorIndexPath) {
      console.log(`[RAG Service] Found report metadata. Loading index from: ${reportMetadata.vectorIndexPath}`);
      
      const vectorStore = await loadIndex(reportMetadata.vectorIndexPath);
      retrievedDocs = await searchIndex(vectorStore, query, 5); // Retrieve top 5 matching passages

      if (retrievedDocs && retrievedDocs.length > 0) {
        documentContext = retrievedDocs
          .map((doc, idx) => {
            const pageNum = doc.metadata?.loc?.pageNumber || 'Unknown';
            return `[Passage ${idx + 1}] (Source Page: ${pageNum}):\n${doc.pageContent}`;
          })
          .join('\n\n');
      } else {
        documentContext = 'Report loaded but similarity search yielded no relevant passages.';
      }
    } else {
      console.log('[RAG Service] No annual report metadata provided. Skipping document retrieval.');
    }

    // 2. Fetch Web Search Context
    console.log(`[RAG Service] Launching web search query for: ${company}`);
    const searchResults = await searchWeb(company);

    if (searchResults && searchResults.length > 0) {
      newsContext = searchResults
        .map((res, idx) => `[News ${idx + 1}]: ${res.title}\nSource: ${res.url}\nContent: ${res.content}`)
        .join('\n\n');
    }

    // 3. Assemble and return context details
    return {
      companyName: company,
      query,
      documentContext,
      newsContext,
      retrievedDocsCount: retrievedDocs.length,
      retrievedDocs: retrievedDocs.map(d => ({
        pageContent: d.pageContent,
        pageNumber: d.metadata?.loc?.pageNumber || 'Unknown'
      }))
    };
  } catch (error) {
    console.error('[RAG Service] Orchestration failed:', error.message);
    throw new Error(`Context retrieval failed: ${error.message}`);
  }
};

export default getResearchContext;
