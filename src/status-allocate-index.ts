/**
 * DEPRECATED: This file is kept for backward compatibility only.
 * 
 * Use the new database-backed service instead:
 * import { allocateStatusIndices } from './status/status-list-service.js';
 * 
 * The new service provides:
 * - Thread-safe allocation with PostgreSQL transactions
 * - Automatic audit logging
 * - Support for multiple status lists
 * - Batch allocation
 * 
 * Example:
 * const indices = await allocateStatusIndices('slu-degree-2025', 1);
 * const index = indices[0];
 */

import { allocateStatusIndices } from './status/status-list-service.js';

/**
 * @deprecated Use allocateStatusIndices from status-list-service.ts instead
 */
export async function allocateStatusIndex(listId: string = 'slu-degree-2025'): Promise<number> {
  console.warn('⚠️  allocateStatusIndex is deprecated. Use allocateStatusIndices from status-list-service.ts');
  const indices = await allocateStatusIndices(listId, 1);
  return indices[0];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const listId = process.argv[2] || 'slu-degree-2025';
  allocateStatusIndex(listId).then((allocated) => {
    console.log(`Allocated status index: ${allocated} in list: ${listId}`);
    process.exit(0);
  }).catch((error) => {
    console.error('Error allocating index:', error);
    process.exit(1);
  });
}
