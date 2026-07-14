import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

// Setup PDFjs worker path
const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

/**
 * Stage 1A — PDF Extractor
 *
 * Takes a Node.js Buffer of a PDF file and returns the raw text content.
 * Uses a modern, locally installed version of pdfjs-dist.
 */
export async function extractTextFromPDF(buffer) {
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      stopAtErrors: false
    });

    const pdfDocument = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text content items
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }

    const text = fullText.trim();

    if (!text || text.length === 0) {
      throw new Error(
        'PDF parsed successfully but contained no extractable text. ' +
        'This is likely a scanned PDF — re-upload as a PNG or JPG image instead.'
      );
    }

    return {
      text,
      confidence: 0.98,
      pageCount: pdfDocument.numPages,
      method: 'pdfjs-dist'
    };
  } catch (error) {
    console.error('[pdfExtractor] Failed to parse PDF using pdfjs-dist:', error.message);
    throw new Error(
      `Could not extract text from this PDF. Reason: ${error.message}. ` +
      `If this is a scanned document, try uploading it as a PNG or JPG image instead.`
    );
  }
}
