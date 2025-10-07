import * as crypto from 'crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encodingForModel } from 'js-tiktoken';

export class KnowledgeBaseService {
  private tokenEncoder: any;

  constructor() {
    // Initialize token encoder for OpenAI models
    try {
      this.tokenEncoder = encodingForModel('gpt-3.5-turbo');
    } catch (error) {
      console.warn('Failed to initialize token encoder:', error);
    }
  }

  // Extract text from various file types
  async extractText(buffer: Buffer, contentType: string, filename: string): Promise<string> {
    try {
      switch (contentType) {
        case 'text/plain':
          return buffer.toString('utf-8');
          
        case 'application/json':
          const json = JSON.parse(buffer.toString('utf-8'));
          return this.jsonToText(json);
          
        case 'application/pdf':
          const pdf = (await import('pdf-parse')).default;
          const pdfData = await pdf(buffer);
          return pdfData.text;
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          const mammoth = (await import('mammoth')).default;
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
          
        default:
          throw new Error(`Unsupported file type: ${contentType}`);
      }
    } catch (error: any) {
      console.error('Error extracting text:', error);
      throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
    }
  }
  
  // Convert JSON to readable text
  private jsonToText(obj: any, depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${indent}[${index}]:`);
          lines.push(this.jsonToText(item, depth + 1));
        } else {
          lines.push(`${indent}[${index}]: ${item}`);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${indent}${key}:`);
          lines.push(this.jsonToText(value, depth + 1));
        } else {
          lines.push(`${indent}${key}: ${value}`);
        }
      }
    } else {
      return String(obj);
    }
    
    return lines.join('\n');
  }
  
  // Chunk text with overlap using LangChain splitter
  async chunkText(text: string, chunkSize = 1000, overlap = 200): Promise<string[]> {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap: overlap,
        separators: ['\n\n', '\n', '.', '!', '?', ',', ' ', ''],
        lengthFunction: (text) => this.countTokens(text),
      });
      
      const chunks = await splitter.splitText(text);
      
      // Filter out empty chunks
      return chunks.filter(chunk => chunk.trim().length > 0);
    } catch (error: any) {
      console.error('Error chunking text:', error);
      // Fallback to simple chunking if LangChain fails
      return this.simpleChunkText(text, chunkSize, overlap);
    }
  }
  
  // Simple fallback chunking method
  private simpleChunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep last part for overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  // Calculate checksum
  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  
  // Count tokens using tiktoken
  countTokens(text: string): number {
    try {
      if (!this.tokenEncoder) {
        // Fallback to approximation if encoder not available
        return Math.ceil(text.length / 4);
      }
      const tokens = this.tokenEncoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback to approximation
      return Math.ceil(text.length / 4);
    }
  }
  
  // Estimate token count (for quick approximation)
  estimateTokens(text: string): number {
    // More accurate approximation based on average token length
    return Math.ceil(text.length / 4);
  }
  
  // Validate file before processing
  validateFile(buffer: Buffer, contentType: string, maxSizeMB = 10): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (buffer.length > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }
    
    const supportedTypes = [
      'text/plain',
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!supportedTypes.includes(contentType)) {
      throw new Error(`Unsupported file type: ${contentType}`);
    }
  }
  
  // Clean up the encoder when done
  cleanup() {
    if (this.tokenEncoder && typeof this.tokenEncoder.free === 'function') {
      this.tokenEncoder.free();
    }
  }
}

// Export singleton instance
export const kbService = new KnowledgeBaseService();