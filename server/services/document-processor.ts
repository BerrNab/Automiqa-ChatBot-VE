import * as crypto from 'crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encodingForModel } from 'js-tiktoken';

/**
 * Chunking configuration types matching the schema
 */
export interface ChunkingStrategy {
  json?: {
    preserveStructure: boolean;
    maxDepth: number;
    chunkSize: number;
    includeKeys: boolean;
  };
  csv?: {
    rowsPerChunk: number;
    includeHeaders: boolean;
    columnSeparator: string;
  };
  excel?: {
    rowsPerChunk: number;
    includeHeaders: boolean;
    includeSheetName: boolean;
    sheetsToProcess?: string[];
  };
  pdf?: {
    chunkSize: number;
    overlap: number;
    preserveParagraphs: boolean;
  };
  text?: {
    chunkSize: number;
    overlap: number;
    respectSentences: boolean;
  };
}

export interface ProcessedChunk {
  text: string;
  metadata: {
    type: string;
    [key: string]: any;
  };
}

export interface ProcessingResult {
  chunks: ProcessedChunk[];
  totalTokens: number;
  fileType: string;
}

/**
 * Default chunking strategies
 */
const DEFAULT_STRATEGY: ChunkingStrategy = {
  json: { preserveStructure: true, maxDepth: 3, chunkSize: 500, includeKeys: true },
  csv: { rowsPerChunk: 10, includeHeaders: true, columnSeparator: ", " },
  excel: { rowsPerChunk: 10, includeHeaders: true, includeSheetName: true },
  pdf: { chunkSize: 1000, overlap: 200, preserveParagraphs: true },
  text: { chunkSize: 1000, overlap: 200, respectSentences: true },
};

/**
 * Document Processor - handles file-type-specific text extraction and chunking
 */
export class DocumentProcessor {
  private tokenEncoder: any;

  constructor() {
    try {
      this.tokenEncoder = encodingForModel('gpt-3.5-turbo');
    } catch (error) {
      console.warn('Failed to initialize token encoder:', error);
    }
  }

  /**
   * Main entry point - process any supported document
   */
  async processDocument(
    buffer: Buffer,
    contentType: string,
    filename: string,
    strategy?: ChunkingStrategy
  ): Promise<ProcessingResult> {
    const mergedStrategy = this.mergeStrategy(strategy);
    const ext = filename.toLowerCase().split('.').pop() || '';

    console.log(`[DocumentProcessor] Processing ${filename} (${contentType})`);

    let result: ProcessingResult;

    switch (contentType) {
      case 'text/plain':
        result = await this.processPlainText(buffer, mergedStrategy.text!);
        break;

      case 'application/json':
        result = await this.processJSON(buffer, mergedStrategy.json!);
        break;

      case 'text/csv':
      case 'application/csv':
        result = await this.processCSV(buffer, mergedStrategy.csv!);
        break;

      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        result = await this.processExcel(buffer, filename, mergedStrategy.excel!);
        break;

      case 'application/pdf':
        result = await this.processPDF(buffer, mergedStrategy.pdf!);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        result = await this.processWord(buffer, mergedStrategy.text!);
        break;

      default:
        throw new Error(`Unsupported file type: ${contentType}`);
    }

    console.log(`[DocumentProcessor] Created ${result.chunks.length} chunks, ~${result.totalTokens} tokens`);
    return result;
  }

  /**
   * Merge user strategy with defaults
   */
  private mergeStrategy(strategy?: ChunkingStrategy): ChunkingStrategy {
    if (!strategy) return DEFAULT_STRATEGY;
    
    return {
      json: { ...DEFAULT_STRATEGY.json!, ...strategy.json },
      csv: { ...DEFAULT_STRATEGY.csv!, ...strategy.csv },
      excel: { ...DEFAULT_STRATEGY.excel!, ...strategy.excel },
      pdf: { ...DEFAULT_STRATEGY.pdf!, ...strategy.pdf },
      text: { ...DEFAULT_STRATEGY.text!, ...strategy.text },
    };
  }

  // ============ Plain Text Processing ============
  private async processPlainText(
    buffer: Buffer,
    config: NonNullable<ChunkingStrategy['text']>
  ): Promise<ProcessingResult> {
    const text = buffer.toString('utf-8');
    const chunks = await this.chunkTextWithConfig(text, config);
    
    return {
      chunks: chunks.map((chunk, idx) => ({
        text: chunk,
        metadata: { type: 'text', chunkIndex: idx },
      })),
      totalTokens: this.countTokens(text),
      fileType: 'text',
    };
  }

  // ============ JSON Processing ============
  private async processJSON(
    buffer: Buffer,
    config: NonNullable<ChunkingStrategy['json']>
  ): Promise<ProcessingResult> {
    const jsonText = buffer.toString('utf-8');
    let json: any;
    
    try {
      json = JSON.parse(jsonText);
    } catch (e) {
      throw new Error('Invalid JSON file');
    }

    const chunks: ProcessedChunk[] = [];

    if (config.preserveStructure) {
      // Smart JSON chunking - preserve semantic units
      this.extractJSONChunks(json, chunks, '', config);
    } else {
      // Flatten and chunk as text
      const flatText = this.jsonToReadableText(json, config.includeKeys);
      const textChunks = await this.chunkTextWithConfig(flatText, {
        chunkSize: config.chunkSize,
        overlap: 100,
        respectSentences: false,
      });
      
      textChunks.forEach((chunk, idx) => {
        chunks.push({
          text: chunk,
          metadata: { type: 'json_flat', chunkIndex: idx },
        });
      });
    }

    return {
      chunks,
      totalTokens: this.countTokens(jsonText),
      fileType: 'json',
    };
  }

  /**
   * Recursively extract chunks from JSON while preserving structure
   */
  private extractJSONChunks(
    obj: any,
    chunks: ProcessedChunk[],
    path: string,
    config: NonNullable<ChunkingStrategy['json']>,
    depth = 0
  ): void {
    // If we've reached max depth or it's a primitive, create a chunk
    if (depth >= config.maxDepth || typeof obj !== 'object' || obj === null) {
      const text = this.formatJSONValue(obj, path, config.includeKeys);
      if (text.length > 10) {
        chunks.push({
          text,
          metadata: { type: 'json', path, depth },
        });
      }
      return;
    }

    if (Array.isArray(obj)) {
      // For arrays, group items together up to chunkSize
      let currentChunk = '';
      let startIdx = 0;
      const arrayPath = path || 'items';

      for (let idx = 0; idx < obj.length; idx++) {
        const item = obj[idx];
        const itemText = this.formatJSONValue(item, `${arrayPath}[${idx}]`, config.includeKeys);
        
        if (currentChunk.length + itemText.length > config.chunkSize && currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: { 
              type: 'json_array', 
              path: arrayPath, 
              startIndex: startIdx, 
              endIndex: idx - 1,
              depth,
            },
          });
          currentChunk = itemText + '\n';
          startIdx = idx;
        } else {
          currentChunk += itemText + '\n';
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: { 
            type: 'json_array', 
            path: arrayPath, 
            startIndex: startIdx, 
            endIndex: obj.length - 1,
            depth,
          },
        });
      }
    } else {
      // For objects, check if it's small enough to be one chunk
      const objText = this.formatJSONValue(obj, path, config.includeKeys);
      
      if (objText.length <= config.chunkSize) {
        chunks.push({
          text: objText,
          metadata: { type: 'json_object', path, depth },
        });
      } else {
        // Recurse into each key
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key;
          this.extractJSONChunks(value, chunks, newPath, config, depth + 1);
        }
      }
    }
  }

  /**
   * Format a JSON value as readable text
   */
  private formatJSONValue(value: any, path: string, includeKeys: boolean): string {
    if (typeof value !== 'object' || value === null) {
      return includeKeys && path ? `${path}: ${value}` : String(value);
    }

    const lines: string[] = [];
    if (includeKeys && path) {
      lines.push(`${path}:`);
    }

    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`  [${idx}]: ${JSON.stringify(item)}`);
        } else {
          lines.push(`  [${idx}]: ${item}`);
        }
      });
    } else {
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'object' && val !== null) {
          lines.push(`  ${key}: ${JSON.stringify(val)}`);
        } else {
          lines.push(`  ${key}: ${val}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert JSON to readable text (flattened)
   */
  private jsonToReadableText(obj: any, includeKeys: boolean, depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          if (includeKeys) lines.push(`${indent}Item ${index + 1}:`);
          lines.push(this.jsonToReadableText(item, includeKeys, depth + 1));
        } else {
          lines.push(`${indent}${includeKeys ? `Item ${index + 1}: ` : ''}${item}`);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (includeKeys) lines.push(`${indent}${key}:`);
          lines.push(this.jsonToReadableText(value, includeKeys, depth + 1));
        } else {
          lines.push(`${indent}${includeKeys ? `${key}: ` : ''}${value}`);
        }
      }
    } else {
      return String(obj);
    }

    return lines.join('\n');
  }

  // ============ CSV Processing ============
  private async processCSV(
    buffer: Buffer,
    config: NonNullable<ChunkingStrategy['csv']>
  ): Promise<ProcessingResult> {
    // Dynamic import for papaparse
    const Papa = (await import('papaparse')).default;
    
    const csvText = buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { 
      header: true, 
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0) {
      console.warn('[DocumentProcessor] CSV parsing warnings:', parsed.errors);
    }

    const chunks: ProcessedChunk[] = [];
    const headers = parsed.meta.fields || [];
    const rows = parsed.data as Record<string, any>[];

    // Create chunks by grouping rows
    for (let i = 0; i < rows.length; i += config.rowsPerChunk) {
      const rowBatch = rows.slice(i, i + config.rowsPerChunk);
      
      let chunkText = '';
      
      // Add headers context
      if (config.includeHeaders) {
        chunkText = `Columns: ${headers.join(config.columnSeparator)}\n\n`;
      }

      // Format each row
      rowBatch.forEach((row, batchIdx) => {
        const rowNum = i + batchIdx + 1;
        chunkText += `Row ${rowNum}:\n`;
        
        headers.forEach(header => {
          const value = row[header];
          if (value !== null && value !== undefined && value !== '') {
            chunkText += `  ${header}: ${value}\n`;
          }
        });
        chunkText += '\n';
      });

      chunks.push({
        text: chunkText.trim(),
        metadata: {
          type: 'csv',
          startRow: i + 1,
          endRow: Math.min(i + config.rowsPerChunk, rows.length),
          totalRows: rows.length,
          headers,
        },
      });
    }

    return {
      chunks,
      totalTokens: this.countTokens(csvText),
      fileType: 'csv',
    };
  }

  // ============ Excel Processing ============
  private async processExcel(
    buffer: Buffer,
    filename: string,
    config: NonNullable<ChunkingStrategy['excel']>
  ): Promise<ProcessingResult> {
    // Dynamic import for xlsx
    const XLSX = await import('xlsx');
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const chunks: ProcessedChunk[] = [];
    let totalTokens = 0;

    // Determine which sheets to process
    const sheetsToProcess = config.sheetsToProcess?.length 
      ? config.sheetsToProcess.filter(s => workbook.SheetNames.includes(s))
      : workbook.SheetNames;

    for (const sheetName of sheetsToProcess) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length === 0) continue;

      // First row as headers
      const headers = data[0].map((h: any) => String(h || ''));
      const rows = data.slice(1);

      // Create chunks by grouping rows
      for (let i = 0; i < rows.length; i += config.rowsPerChunk) {
        const rowBatch = rows.slice(i, i + config.rowsPerChunk);
        
        let chunkText = '';
        
        // Add sheet name context
        if (config.includeSheetName) {
          chunkText = `Sheet: ${sheetName}\n`;
        }
        
        // Add headers context
        if (config.includeHeaders) {
          chunkText += `Columns: ${headers.join(', ')}\n\n`;
        }

        // Format each row
        rowBatch.forEach((row, batchIdx) => {
          const rowNum = i + batchIdx + 1;
          chunkText += `Row ${rowNum}:\n`;
          
          headers.forEach((header, colIdx) => {
            const value = row[colIdx];
            if (value !== null && value !== undefined && value !== '') {
              chunkText += `  ${header}: ${value}\n`;
            }
          });
          chunkText += '\n';
        });

        chunks.push({
          text: chunkText.trim(),
          metadata: {
            type: 'excel',
            sheetName,
            startRow: i + 1,
            endRow: Math.min(i + config.rowsPerChunk, rows.length),
            totalRows: rows.length,
            headers,
          },
        });

        totalTokens += this.countTokens(chunkText);
      }
    }

    return {
      chunks,
      totalTokens,
      fileType: 'excel',
    };
  }

  // ============ PDF Processing ============
  private async processPDF(
    buffer: Buffer,
    config: NonNullable<ChunkingStrategy['pdf']>
  ): Promise<ProcessingResult> {
    // Dynamic import for pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    
    const pdfData = await pdfParse(buffer);
    let text = pdfData.text;

    // Clean up PDF text
    text = this.cleanPDFText(text, config.preserveParagraphs);

    const chunks = await this.chunkTextWithConfig(text, {
      chunkSize: config.chunkSize,
      overlap: config.overlap,
      respectSentences: true,
    });

    return {
      chunks: chunks.map((chunk, idx) => ({
        text: chunk,
        metadata: { 
          type: 'pdf', 
          chunkIndex: idx,
          pageCount: pdfData.numpages,
        },
      })),
      totalTokens: this.countTokens(text),
      fileType: 'pdf',
    };
  }

  /**
   * Clean up PDF extracted text
   */
  private cleanPDFText(text: string, preserveParagraphs: boolean): string {
    // Remove excessive whitespace
    text = text.replace(/[ \t]+/g, ' ');
    
    if (preserveParagraphs) {
      // Preserve paragraph breaks (double newlines)
      text = text.replace(/\n{3,}/g, '\n\n');
      // But join lines within paragraphs
      text = text.replace(/([^\n])\n([^\n])/g, '$1 $2');
    } else {
      // Join all lines
      text = text.replace(/\n+/g, ' ');
    }
    
    return text.trim();
  }

  // ============ Word Document Processing ============
  private async processWord(
    buffer: Buffer,
    config: NonNullable<ChunkingStrategy['text']>
  ): Promise<ProcessingResult> {
    // Dynamic import for mammoth
    const mammoth = (await import('mammoth')).default;
    
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    const chunks = await this.chunkTextWithConfig(text, config);

    return {
      chunks: chunks.map((chunk, idx) => ({
        text: chunk,
        metadata: { type: 'word', chunkIndex: idx },
      })),
      totalTokens: this.countTokens(text),
      fileType: 'word',
    };
  }

  // ============ Text Chunking ============
  /**
   * Chunk text using LangChain splitter with configuration
   */
  private async chunkTextWithConfig(
    text: string,
    config: { chunkSize: number; overlap: number; respectSentences: boolean }
  ): Promise<string[]> {
    try {
      // Choose separators based on whether we respect sentences
      const separators = config.respectSentences
        ? ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', '']
        : ['\n\n', '\n', ' ', ''];

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: config.chunkSize,
        chunkOverlap: config.overlap,
        separators,
        lengthFunction: (text) => this.countTokens(text),
      });

      const chunks = await splitter.splitText(text);
      
      // Filter out empty or too-small chunks
      return chunks.filter(chunk => chunk.trim().length > 20);
    } catch (error: any) {
      console.error('[DocumentProcessor] Error chunking text:', error);
      // Fallback to simple chunking
      return this.simpleChunkText(text, config.chunkSize, config.overlap);
    }
  }

  /**
   * Simple fallback chunking method
   */
  private simpleChunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // ============ Utility Methods ============
  /**
   * Count tokens using tiktoken
   */
  countTokens(text: string): number {
    try {
      if (!this.tokenEncoder) {
        return Math.ceil(text.length / 4);
      }
      const tokens = this.tokenEncoder.encode(text);
      return tokens.length;
    } catch (error) {
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Calculate file checksum
   */
  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Validate file before processing
   */
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
      'application/msword',
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!supportedTypes.includes(contentType)) {
      throw new Error(`Unsupported file type: ${contentType}. Supported: PDF, Word, Text, JSON, CSV, Excel`);
    }
  }

  /**
   * Get supported file types
   */
  getSupportedTypes(): string[] {
    return [
      'text/plain (.txt)',
      'application/json (.json)',
      'application/pdf (.pdf)',
      'application/msword (.doc)',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)',
      'text/csv (.csv)',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)',
      'application/vnd.ms-excel (.xls)',
    ];
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.tokenEncoder && typeof this.tokenEncoder.free === 'function') {
      this.tokenEncoder.free();
    }
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
