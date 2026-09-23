import type { DocumentItem, ChunkItem, DocumentDateFilter } from '../types/index.ts';

/**
 * Parses and normalizes various date strings to standard ISO 'YYYY-MM-DD'.
 * Supports 'DD/MM/YYYY' (EVN documents format) and 'YYYY-MM-DD' (HTML date input format).
 * Returns null if the date string is invalid, empty, or unparseable.
 */
export function parseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return null;
  }

  // Case 1: 'DD/MM/YYYY' (e.g. '01/01/2025' or '15/6/2024')
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return null;
    }

    const paddedDay = day.toString().padStart(2, '0');
    const paddedMonth = month.toString().padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // Case 2: 'YYYY-MM-DD' (e.g. '2025-01-01')
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return null;
    }

    const paddedDay = day.toString().padStart(2, '0');
    const paddedMonth = month.toString().padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return null;
}

/**
 * Checks if a target date falls within [startDate, endDate] inclusive.
 * Handles single-boundary filters (start-only, end-only) and no filter.
 * Invalid or missing dates are safely rejected when a filter is active.
 */
export function isDateInRange(
  dateStr?: string | null,
  startDate?: string | null,
  endDate?: string | null
): boolean {
  const startIso = parseDateToIso(startDate);
  const endIso = parseDateToIso(endDate);

  // If no date filters are set, every document matches
  if (!startIso && !endIso) {
    return true;
  }

  // A filter boundary exists; validate target date
  const targetIso = parseDateToIso(dateStr);
  if (!targetIso) {
    return false;
  }

  // Check lower bound
  if (startIso && targetIso < startIso) {
    return false;
  }

  // Check upper bound
  if (endIso && targetIso > endIso) {
    return false;
  }

  return true;
}

/**
 * Filters a list of DocumentItems by publication/effective date range.
 */
export function filterDocumentsByDate(
  documents: DocumentItem[],
  filter?: DocumentDateFilter | null
): DocumentItem[] {
  if (!documents || !Array.isArray(documents)) {
    return [];
  }

  if (!filter || (!filter.startDate && !filter.endDate)) {
    return documents;
  }

  return documents.filter(doc => isDateInRange(doc.effectiveDate, filter.startDate, filter.endDate));
}

/**
 * Filters a list of ChunkItems by publication/effective date range.
 */
export function filterChunksByDate(
  chunks: ChunkItem[],
  filter?: DocumentDateFilter | null
): ChunkItem[] {
  if (!chunks || !Array.isArray(chunks)) {
    return [];
  }

  if (!filter || (!filter.startDate && !filter.endDate)) {
    return chunks;
  }

  return chunks.filter(chunk => isDateInRange(chunk.effectiveDate, filter.startDate, filter.endDate));
}
