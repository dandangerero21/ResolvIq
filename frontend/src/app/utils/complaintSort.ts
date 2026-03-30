import type { Complaint, Priority } from '../types';
import { complaintCategoryLabel } from './complaintCategoryLabel';

export type ComplaintSortKey = 'newest' | 'oldest' | 'updated' | 'priority' | 'title' | 'category';

export function isComplaintResolved(c: Complaint): boolean {
  return c.status === 'resolved' || c.status === 'Resolved';
}

/** Preserves order: splits into active first, resolved last (for sectioned UI). */
export function partitionActiveAndResolved(list: Complaint[]): { active: Complaint[]; resolved: Complaint[] } {
  const active: Complaint[] = [];
  const resolved: Complaint[] = [];
  for (const c of list) {
    if (isComplaintResolved(c)) resolved.push(c);
    else active.push(c);
  }
  return { active, resolved };
}

function getCreatedTime(c: Complaint): number {
  if (!c.createdAt) return 0;
  const t = new Date(c.createdAt as Date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function getUpdatedTime(c: Complaint): number {
  const d = c.updatedAt ?? c.createdAt;
  if (!d) return 0;
  const t = new Date(d as Date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function priorityRank(p?: Priority): number {
  const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return p != null && p in order ? order[p] : 4;
}

export function sortComplaints(list: Complaint[], key: ComplaintSortKey): Complaint[] {
  const copy = [...list];
  switch (key) {
    case 'newest':
      return copy.sort((a, b) => getCreatedTime(b) - getCreatedTime(a));
    case 'oldest':
      return copy.sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
    case 'updated':
      return copy.sort((a, b) => getUpdatedTime(b) - getUpdatedTime(a));
    case 'priority':
      return copy.sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return getCreatedTime(b) - getCreatedTime(a);
      });
    case 'title':
      return copy.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      );
    case 'category':
      return copy.sort((a, b) =>
        complaintCategoryLabel(a).localeCompare(complaintCategoryLabel(b), undefined, {
          sensitivity: 'base',
        })
      );
    default:
      return copy;
  }
}
