import { createWorker } from 'tesseract.js';

/**
 * Stage 1B — Image OCR Extractor
 *
 * Takes a Node.js Buffer of a PNG or JPG file and returns the raw text content.
 *
 * How it works:
 * - tesseract.js is a WebAssembly port of Google's Tesseract OCR engine.
 * - createWorker() spawns a worker process and loads the English language model (~4MB).
 * - worker.recognize(buffer) runs the OCR pipeline:
 *     1. Image preprocessing (binarization, deskew)
 *     2. Layout analysis (find text regions)
 *     3. Character recognition per region
 * - Returns recognized text and a confidence score (0–100) averaged across all words.
 * - We normalize confidence to 0.0–1.0 to match pdfExtractor's format.
 *
 * Confidence is variable: sharp, high-contrast text scores ~0.90+,
 * blurry or low-res scans can score as low as 0.50.
 */
export async function extractTextFromImage(buffer) {
  const worker = await createWorker('eng', 1, { workerPath: "./node_modules/tesseract.js/src/worker-script/node/index.js" });

  try {
    const result = await worker.recognize(buffer);
    const text = result.data.text?.trim() || '';
    const rawConfidence = result.data.confidence; // 0–100

    if (!text || text.length === 0) {
      throw new Error(
        'OCR completed but no text was recognized. ' +
        'Ensure the image is clear, well-lit, and contains readable text.'
      );
    }

    return {
      text,
      confidence: Number((rawConfidence / 100).toFixed(2)), // normalize to 0.0–1.0
      method: 'tesseract.js (Tesseract OCR WebAssembly)'
    };
  } finally {
    // Always terminate the worker to release WebAssembly memory
    await worker.terminate();
  }
}
