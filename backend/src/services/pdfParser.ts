import { PDFParseResult } from '../types';

export async function parsePDF(fileBuffer: Buffer): Promise<PDFParseResult> {
  const pdfParse = require('pdf-parse');
  
  try {
    const data = await pdfParse(fileBuffer);
    const text = data.text.replace(/�/g, "").trim();
    
    console.log(`✅ Successfully parsed PDF: ${data.numpages} pages, ${text.length} characters`);
    
    return {
      text: text,
      numPages: data.numpages,
    };
  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse PDF: ${errorMessage}`);
  }
}