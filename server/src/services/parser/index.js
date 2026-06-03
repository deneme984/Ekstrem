/**
 * @fileoverview PDF Parser Service — Ekstrem v1.0
 *
 * Placeholder for the PDF parser service. The full bank-specific parsers
 * will be implemented by the PDF Parser agent on feature/pdf-parser.
 *
 * The `parse()` function is called by `gmailController.parseStatements()`.
 * It receives raw PDF bytes and a bank context object, and returns
 * structured financial data.
 *
 * @example
 * const result = await parserService.parse(pdfBuffer, { bankId: 'garantibbva' });
 * // result: { cards: [...], statements: [...], transactions: [...] }
 */

/**
 * Parse a credit card statement PDF and return structured data.
 *
 * @param {Buffer} pdfBuffer - Raw PDF file bytes
 * @param {{ bankId: string, filename?: string, messageId?: string }} context
 *   Context about which bank sent this PDF and where it came from.
 * @returns {Promise<{
 *   cards: Array<Object>,
 *   statements: Array<Object>,
 *   transactions: Array<Object>,
 * }>}
 */
async function parse(pdfBuffer, context) {
  // Placeholder — PDF Parser agent will implement bank-specific parsers.
  // Each bank parser will live in services/parser/banks/<bankId>.js
  return {
    cards: [],
    statements: [],
    transactions: [],
  };
}

const parserService = { parse };

export { parse };
export default parserService;
