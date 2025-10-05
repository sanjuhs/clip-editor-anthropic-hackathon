"use client";

/**
 * Document processing utilities for text extraction and analysis
 */

/**
 * Extract text content from various document types
 */
export async function extractTextFromDocument(
  file: File
): Promise<{ text: string; preview: string }> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  try {
    // Handle plain text files
    if (
      fileType === "text/plain" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".markdown")
    ) {
      const text = await file.text();
      const preview = text.substring(0, 500);
      return { text, preview };
    }

    // Handle JSON files
    if (fileType === "application/json" || fileName.endsWith(".json")) {
      const text = await file.text();
      const preview = text.substring(0, 500);
      return { text, preview };
    }

    // Handle CSV files
    if (fileType === "text/csv" || fileName.endsWith(".csv")) {
      const text = await file.text();
      const preview = text.substring(0, 500);
      return { text, preview };
    }

    // Handle HTML files
    if (fileType === "text/html" || fileName.endsWith(".html")) {
      const text = await file.text();
      // Strip HTML tags for raw text
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = text;
      const strippedText = tempDiv.textContent || tempDiv.innerText || "";
      const preview = strippedText.substring(0, 500);
      return { text: strippedText, preview };
    }

    // For unsupported formats, return an error message
    throw new Error(
      `Unsupported document format: ${
        fileType || fileName
      }. Currently supported: .txt, .md, .json, .csv, .html`
    );
  } catch (error: any) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Generate a summary from document text using AI
 * This sends the text to an AI model for summarization
 */
export async function summarizeDocument(
  text: string,
  fileName: string
): Promise<string> {
  // For now, create a simple summary based on the first few sentences
  // In the future, this could call an AI API for better summarization
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const firstSentences = sentences.slice(0, 3).join(". ");
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  if (firstSentences) {
    return `Document "${fileName}" contains ${wordCount} words (${charCount} characters). Preview: ${firstSentences}...`;
  }

  return `Document "${fileName}" contains ${wordCount} words (${charCount} characters).`;
}

/**
 * Analyze document structure and extract metadata
 */
export function analyzeDocumentStructure(text: string): {
  wordCount: number;
  charCount: number;
  lineCount: number;
  paragraphCount: number;
} {
  const lines = text.split("\n");
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  return {
    wordCount: words.length,
    charCount: text.length,
    lineCount: lines.length,
    paragraphCount: paragraphs.length,
  };
}
