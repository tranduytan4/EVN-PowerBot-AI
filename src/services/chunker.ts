import { DocumentItem, ChunkItem } from '../types';

export interface ChunkingOptions {
  chunkSize: number; // in characters, e.g. 350
  chunkOverlap: number; // in characters, e.g. 60
}

export function chunkDocuments(
  documents: DocumentItem[],
  options: ChunkingOptions = { chunkSize: 350, chunkOverlap: 60 }
): ChunkItem[] {
  const { chunkSize, chunkOverlap } = options;
  const allChunks: ChunkItem[] = [];

  for (const doc of documents) {
    const docChunks: ChunkItem[] = [];

    // Process section by section to keep semantic boundaries
    for (const section of doc.sections) {
      const sectionText = `${section.heading}\n${section.text}`.trim();
      
      if (sectionText.length <= chunkSize) {
        docChunks.push({
          id: `${doc.id}-chk-${docChunks.length + 1}`,
          docId: doc.id,
          docCode: doc.docCode,
          docTitle: doc.title,
          sectionHeading: section.heading,
          department: doc.department,
          effectiveDate: doc.effectiveDate,
          content: sectionText,
          chunkIndex: docChunks.length + 1,
          totalChunksInDoc: 0, // updated later
          tokenCount: Math.ceil(sectionText.split(/\s+/).length * 1.3),
        });
      } else {
        // Split section with overlap using sentence boundaries
        let start = 0;
        while (start < sectionText.length) {
          let end = Math.min(start + chunkSize, sectionText.length);
          
          // Try to break at sentence or newline if not at the end
          if (end < sectionText.length) {
            const nextPeriod = sectionText.lastIndexOf('. ', end);
            const nextNewline = sectionText.lastIndexOf('\n', end);
            const breakPoint = Math.max(nextPeriod + 1, nextNewline);
            if (breakPoint > start + Math.floor(chunkSize * 0.5)) {
              end = breakPoint;
            }
          }

          const chunkContent = sectionText.substring(start, end).trim();
          if (chunkContent.length > 20) {
            docChunks.push({
              id: `${doc.id}-chk-${docChunks.length + 1}`,
              docId: doc.id,
              docCode: doc.docCode,
              docTitle: doc.title,
              sectionHeading: section.heading,
              department: doc.department,
              effectiveDate: doc.effectiveDate,
              content: chunkContent,
              chunkIndex: docChunks.length + 1,
              totalChunksInDoc: 0,
              tokenCount: Math.ceil(chunkContent.split(/\s+/).length * 1.3),
            });
          }

          if (end >= sectionText.length) break;
          start = Math.max(0, end - chunkOverlap);
        }
      }
    }

    // Update total chunks in doc
    for (const chk of docChunks) {
      chk.totalChunksInDoc = docChunks.length;
      allChunks.push(chk);
    }
  }

  return allChunks;
}
