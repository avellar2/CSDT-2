declare module 'pdf-parse' {
  interface PDFParseOptions {
    version?: string;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function pdf(dataBuffer: BufferSource, options?: PDFParseOptions): Promise<PDFParseResult>;

  export = pdf;
}