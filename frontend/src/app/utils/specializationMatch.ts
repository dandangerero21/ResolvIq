import type { Complaint } from '../types';

/** Category labels that must not be used alone for specialization matching */
const OTHER_LABELS = new Set(['other', 'others', 'misc', 'miscellaneous']);

/**
 * Build lowercase tokens from complaint category + custom "Other" text.
 * Skips vague "Other" so we don't match every staff against the word "other".
 */
function complaintMatchTokens(complaint: Complaint): Set<string> {
  const tokens = new Set<string>();
  const addPhrase = (phrase: string | undefined | null) => {
    if (!phrase?.trim()) return;
    const p = phrase.trim().toLowerCase();
    if (OTHER_LABELS.has(p)) return;
    tokens.add(p);
    for (const w of p.split(/[\s,;|/]+/)) {
      if (w.length >= 2) tokens.add(w);
    }
  };

  const raw = complaint as Complaint & { custom_category?: string; category_name?: string };
  addPhrase(complaint.customCategory ?? raw.custom_category);
  addPhrase(complaint.categoryName ?? raw.category_name);
  if (complaint.category) addPhrase(String(complaint.category));

  return tokens;
}

/** True if staff specialization string matches the complaint category / custom Other text */
export function specializationMatchesComplaint(
  specialization: string | undefined | null,
  complaint: Complaint
): boolean {
  if (!specialization?.trim()) return false;
  const tokens = complaintMatchTokens(complaint);
  if (tokens.size === 0) return false;

  return specialization.split(',').some(blob => {
    const seg = blob.trim().toLowerCase();
    if (!seg) return false;
    const parts = seg.split(/[\s,;|/]+/).filter(p => p.length >= 2);
    const needles = parts.length > 0 ? parts : seg.length >= 2 ? [seg] : [];

    return needles.some(needle =>
      [...tokens].some(t => t === needle || t.includes(needle) || needle.includes(t))
    );
  });
}
