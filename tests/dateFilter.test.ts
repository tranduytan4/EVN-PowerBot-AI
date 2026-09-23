import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateToIso,
  isDateInRange,
  filterDocumentsByDate,
  filterChunksByDate
} from '../src/utils/dateFilter.ts';
import type { DocumentItem, ChunkItem } from '../src/types/index.ts';

describe('Document Date Filter Unit Tests', () => {
  // Mock dataset representing EVN documents
  const mockDocs: DocumentItem[] = [
    {
      id: 'doc-01',
      docCode: 'QD-2023-01',
      title: 'Quy định EVN 2023',
      category: 'Chính sách',
      effectiveDate: '15/03/2023',
      summary: 'Quy định năm 2023',
      content: 'Nội dung văn bản năm 2023...'
    },
    {
      id: 'doc-02',
      docCode: 'QD-2024-06',
      title: 'Quy chuẩn Kỹ thuật EVN 2024',
      category: 'Kỹ thuật',
      effectiveDate: '10/06/2024',
      summary: 'Quy chuẩn kỹ thuật ban hành tháng 6/2024',
      content: 'Nội dung quy chuẩn năm 2024...'
    },
    {
      id: 'doc-03',
      docCode: 'QD-2025-01',
      title: 'Biểu giá điện EVN 2025',
      category: 'Biểu giá',
      effectiveDate: '01/01/2025',
      summary: 'Biểu giá điện mới nhất áp dụng từ 2025',
      content: 'Nội dung biểu giá năm 2025...'
    }
  ];

  const mockChunks: ChunkItem[] = [
    {
      id: 'chk-01-0',
      docId: 'doc-01',
      docCode: 'QD-2023-01',
      docTitle: 'Quy định EVN 2023',
      category: 'Chính sách',
      effectiveDate: '15/03/2023',
      chunkIndex: 0,
      totalChunksInDoc: 1,
      sectionHeading: 'Điều 1',
      content: 'Nội dung chunk 1 năm 2023',
      tokenCount: 20
    },
    {
      id: 'chk-02-0',
      docId: 'doc-02',
      docCode: 'QD-2024-06',
      docTitle: 'Quy chuẩn Kỹ thuật EVN 2024',
      category: 'Kỹ thuật',
      effectiveDate: '10/06/2024',
      chunkIndex: 0,
      totalChunksInDoc: 1,
      sectionHeading: 'Mục 1',
      content: 'Nội dung chunk 2 năm 2024',
      tokenCount: 25
    },
    {
      id: 'chk-03-0',
      docId: 'doc-03',
      docCode: 'QD-2025-01',
      docTitle: 'Biểu giá điện EVN 2025',
      category: 'Biểu giá',
      effectiveDate: '01/01/2025',
      chunkIndex: 0,
      totalChunksInDoc: 1,
      sectionHeading: 'Bảng 1',
      content: 'Nội dung chunk 3 năm 2025',
      tokenCount: 30
    }
  ];

  // =========================================================================
  // Test Case 1: Document within date range
  // =========================================================================
  test('Test Case 1: Document within date range should be included', () => {
    // 10/06/2024 is strictly inside [2024-01-01, 2024-12-31]
    const inRange = isDateInRange('10/06/2024', '2024-01-01', '2024-12-31');
    assert.equal(inRange, true, 'Date 10/06/2024 should fall inside 2024 range');

    const filtered = filterDocumentsByDate(mockDocs, {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'doc-02');
    assert.equal(filtered[0].effectiveDate, '10/06/2024');

    // Chunks filter check
    const filteredChunks = filterChunksByDate(mockChunks, {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    assert.equal(filteredChunks.length, 1);
    assert.equal(filteredChunks[0].id, 'chk-02-0');
  });

  // =========================================================================
  // Test Case 2: Document before date range
  // =========================================================================
  test('Test Case 2: Document before date range should be excluded', () => {
    // 15/03/2023 is before [2024-01-01, 2025-12-31]
    const inRange = isDateInRange('15/03/2023', '2024-01-01', '2025-12-31');
    assert.equal(inRange, false, 'Date 15/03/2023 should be excluded (before start)');

    const filtered = filterDocumentsByDate(mockDocs, {
      startDate: '2024-01-01',
      endDate: '2025-12-31'
    });
    const containsDoc01 = filtered.some(doc => doc.id === 'doc-01');
    assert.equal(containsDoc01, false, 'doc-01 (from 2023) should not be present');
  });

  // =========================================================================
  // Test Case 3: Document after date range
  // =========================================================================
  test('Test Case 3: Document after date range should be excluded', () => {
    // 01/01/2025 is after [2023-01-01, 2024-12-31]
    const inRange = isDateInRange('01/01/2025', '2023-01-01', '2024-12-31');
    assert.equal(inRange, false, 'Date 01/01/2025 should be excluded (after end)');

    const filtered = filterDocumentsByDate(mockDocs, {
      startDate: '2023-01-01',
      endDate: '2024-12-31'
    });
    const containsDoc03 = filtered.some(doc => doc.id === 'doc-03');
    assert.equal(containsDoc03, false, 'doc-03 (from 2025) should not be present');
  });

  // =========================================================================
  // Test Case 4: Filter with only start date (open-ended upper bound)
  // =========================================================================
  test('Test Case 4: Filter with only start date includes all docs on or after that date', () => {
    // From 2024-01-01 onward -> includes 2024 and 2025, excludes 2023
    const filtered = filterDocumentsByDate(mockDocs, {
      startDate: '2024-01-01'
    });
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map(d => d.id).sort(), ['doc-02', 'doc-03']);

    // Boundary equality check: exact start date
    assert.equal(isDateInRange('01/01/2024', '2024-01-01', null), true);
  });

  // =========================================================================
  // Test Case 5: Filter with only end date (open-ended lower bound)
  // =========================================================================
  test('Test Case 5: Filter with only end date includes all docs up to that date', () => {
    // Up to 2024-05-31 -> includes 2023, excludes June 2024 and 2025
    const filtered = filterDocumentsByDate(mockDocs, {
      endDate: '2024-05-31'
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'doc-01');

    // Up to 2024-12-31 -> includes 2023 and 2024
    const filteredUpTo2024 = filterDocumentsByDate(mockDocs, {
      endDate: '2024-12-31'
    });
    assert.equal(filteredUpTo2024.length, 2);
    assert.deepEqual(filteredUpTo2024.map(d => d.id).sort(), ['doc-01', 'doc-02']);
  });

  // =========================================================================
  // Test Case 6: No date filter (returns all documents)
  // =========================================================================
  test('Test Case 6: No date filter returns all documents unmodified', () => {
    // Empty object
    const res1 = filterDocumentsByDate(mockDocs, {});
    assert.equal(res1.length, mockDocs.length);

    // Undefined filter
    const res2 = filterDocumentsByDate(mockDocs, undefined);
    assert.equal(res2.length, mockDocs.length);

    // Object with undefined/empty values
    const res3 = filterDocumentsByDate(mockDocs, { startDate: '', endDate: '' });
    assert.equal(res3.length, mockDocs.length);

    // Chunks with no filter
    const chunkRes = filterChunksByDate(mockChunks, {});
    assert.equal(chunkRes.length, mockChunks.length);
  });

  // =========================================================================
  // Test Case 7: Filter matching no documents
  // =========================================================================
  test('Test Case 7: Filter matching no documents returns empty array gracefully', () => {
    const filtered = filterDocumentsByDate(mockDocs, {
      startDate: '2010-01-01',
      endDate: '2015-12-31'
    });
    assert.ok(Array.isArray(filtered));
    assert.equal(filtered.length, 0);

    const chunkFiltered = filterChunksByDate(mockChunks, {
      startDate: '2099-01-01'
    });
    assert.ok(Array.isArray(chunkFiltered));
    assert.equal(chunkFiltered.length, 0);
  });

  // =========================================================================
  // Test Case 8: Invalid date format handling
  // =========================================================================
  test('Test Case 8: Invalid and missing dates are handled safely without crashing', () => {
    // parseDateToIso handling
    assert.equal(parseDateToIso(null), null);
    assert.equal(parseDateToIso(undefined), null);
    assert.equal(parseDateToIso(''), null);
    assert.equal(parseDateToIso('   '), null);
    assert.equal(parseDateToIso('invalid-date-string'), null);
    assert.equal(parseDateToIso('32/01/2024'), null); // invalid day
    assert.equal(parseDateToIso('15/13/2024'), null); // invalid month
    assert.equal(parseDateToIso('2024-13-40'), null); // invalid ISO month/day

    // When filter is NOT active, even invalid dates are safely tolerated
    assert.equal(isDateInRange('invalid-date', null, null), true);

    // When filter IS active, invalid target date is rejected (excluded)
    assert.equal(isDateInRange('not-a-date', '2024-01-01', '2024-12-31'), false);
    assert.equal(isDateInRange(null, '2024-01-01', '2024-12-31'), false);
    assert.equal(isDateInRange(undefined, '2024-01-01', '2024-12-31'), false);

    // Document with invalid date in collection
    const docsWithBadData: DocumentItem[] = [
      ...mockDocs,
      {
        id: 'doc-corrupt',
        docCode: 'QD-CORRUPT',
        title: 'Văn bản lỗi ngày',
        category: 'Khác',
        effectiveDate: 'invalid-date',
        summary: 'Lỗi',
        content: 'Nội dung'
      }
    ];

    const result = filterDocumentsByDate(docsWithBadData, {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'doc-02');
  });
});
