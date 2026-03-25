import type { Complaint } from '../types';

export function complaintCategoryLabel(
  c: Pick<Complaint, 'categoryName' | 'category' | 'customCategory'>
): string {
  const custom = c.customCategory?.trim();
  if (custom) return `Other: ${custom}`;
  return c.categoryName || c.category || 'Other';
}
