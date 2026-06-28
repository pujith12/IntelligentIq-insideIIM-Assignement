import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import path from 'path';
import fs from 'fs';

/**
 * Loads a PDF file from the disk and splits it into logical, overlapping text chunks.
 * @param {string} relativeFilePath - Relative path to the PDF file (e.g. 'uploads/tesla-xyz.pdf')
 * @returns {Promise<Array<Object>>} - Array of split LangChain Document objects
 */
export const processPDF = async (relativeFilePath) => {
  try {
    // Resolve absolute path to the PDF file
    const absolutePath = path.resolve(relativeFilePath);

    // 1. Verify file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found at path: ${absolutePath}`);
    }

    console.log(`[PDF Service] Loading PDF from: ${absolutePath}`);
    
    // 2. Load PDF document pages using LangChain PDFLoader
    const loader = new PDFLoader(absolutePath, {
      splitPages: true, // Split pages into separate documents
    });
    const docs = await loader.load();
    console.log(`[PDF Service] Successfully loaded PDF. Total pages: ${docs.length}`);

    // Validate that the document actually has pages
    if (!docs || docs.length === 0) {
      throw new Error('The PDF document appears to have 0 pages. Please verify the file is not corrupted.');
    }

    // Check if the total combined text content of the pages is empty
    const combinedText = docs.map(doc => doc.pageContent || '').join('').trim();
    if (combinedText.length < 15) {
      throw new Error('The PDF contains no readable text content. Please ensure the document is not a scanned image, blank, or password-protected.');
    }

    // 3. Configure text splitter
    // chunkSize is 1000 characters (approx. 150-200 words)
    // chunkOverlap is 200 characters to preserve semantic transition
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // 4. Split loaded page documents into smaller chunks
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`[PDF Service] Split PDF into ${splitDocs.length} text chunks`);

    if (!splitDocs || splitDocs.length === 0) {
      throw new Error('No text chunks could be generated from the document. Please ensure it contains readable textual data.');
    }

    return splitDocs;
  } catch (error) {
    console.error('[PDF Service] Error processing PDF:', error.message);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};
export default processPDF;
