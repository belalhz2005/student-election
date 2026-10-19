/**
 * Core pure business logic for SPU Dental Student Council Elections.
 * Handles ID normalization, Arabic name normalization, cohort detection,
 * ballot counting, winner determination, and verification hashes.
 */

export interface Cohort {
  id: string;
  prefix: string; // e.g. "224"
  labelEn: string; // e.g. "Year 3 (Intake 24/25)"
  labelAr: string; // e.g. "السنة الثالثة (دفعة 24/25)"
  academicYear: number; // 1 to 5
  open?: boolean; // Controls voting state for this specific academic year
}

export interface Candidate {
  id: string;
  cohortId: string;
  nameEn: string;
  nameAr: string;
  sloganEn?: string;
  sloganAr?: string;
  avatarUrl?: string;
}

export interface Vote {
  id: string;
  uniId: string;
  studentName: string;
  cohortId: string;
  candidateId: string;
  timestamp: number;
  receiptCode: string;
  nameMismatch?: boolean;
  device?: string | null; // random per-browser id, only used to flag several votes from one phone
}

export interface RosterEntry {
  uniId: string;
  name: string;
  cohortPrefix?: string;
  pin?: string;
}

export interface CandidateResult {
  id: string;
  nameEn: string;
  nameAr: string;
  votes: number;
  percentage: number; // 0 to 100
  isWinner: boolean;
  isTied: boolean;
}

export interface CohortResult {
  cohort: Cohort;
  totalVotes: number;
  eligibleCount: number | null;
  turnoutPercentage: number | null;
  candidates: CandidateResult[];
  status: 'none' | 'winner' | 'tie';
  winnerNamesEn: string[];
  winnerNamesAr: string[];
}

/**
 * Normalizes Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard ASCII digits.
 */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
}

/**
 * Normalizes full student university ID (digits only, no spaces or special chars).
 */
export function normalizeUniId(rawId: string): string {
  return normalizeDigits(rawId).replace(/\D/g, '');
}

/**
 * Normalizes Arabic names to handle slight spelling variations:
 * - Unifies Alef with Hamza: أ, إ, آ -> ا
 * - Removes Arabic diacritics / tashkeel (fat-ha, damma, kasra, shadda, sukun, tanween)
 * - Removes Tatweel / Kashida (ـ)
 * - Normalizes Taa Marbuta (ة) and Haa (ه)
 * - Normalizes Alef Maqsura (ى) and Yaa (ي)
 * - Normalizes multiple spaces into a single space
 */
export function normalizeArabicName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, '') // Remove tashkeel & tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates that name has at least 2 words and valid letters.
 */
export function validateStudentName(name: string): { valid: boolean; error?: string } {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { valid: false, error: 'Please enter your full name (at least first name and last name)' };
  }
  // Check that words contain letters (Arabic or Latin)
  const letterRegex = /^[\p{L}\p{M}\s'’.\-]+$/u;
  if (!letterRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  return { valid: true };
}

/**
 * Finds matching academic cohort based on longest prefix match.
 * Example: ID 2240207 starts with 224 -> Year 3.
 */
export function findCohortForId(uniId: string, cohorts: Cohort[]): Cohort | null {
  if (!uniId || !cohorts.length) return null;
  const sorted = [...cohorts].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((c) => uniId.startsWith(c.prefix)) || null;
}

/**
 * Computes election results, winner per year, and turnout percentages.
 */
export function calculateElectionResults(
  cohorts: Cohort[],
  candidates: Candidate[],
  votes: Vote[],
  eligiblePerCohort?: Record<string, number>
): CohortResult[] {
  // Count votes per candidate & per cohort
  const votesPerCandidate = new Map<string, number>();
  const votesPerCohort = new Map<string, number>();

  for (const v of votes) {
    votesPerCandidate.set(v.candidateId, (votesPerCandidate.get(v.candidateId) || 0) + 1);
    votesPerCohort.set(v.cohortId, (votesPerCohort.get(v.cohortId) || 0) + 1);
  }

  return cohorts
    .slice()
    .sort((a, b) => a.academicYear - b.academicYear)
    .map((cohort) => {
      const cohortCandidates = candidates.filter((c) => c.cohortId === cohort.id);
      const totalCohortVotes = votesPerCohort.get(cohort.id) || 0;
      const eligible = eligiblePerCohort?.[cohort.id] ?? null;
      const turnoutPercentage = eligible && eligible > 0 ? Math.round((totalCohortVotes / eligible) * 1000) / 10 : null;

      // Find max votes
      let maxVotes = 0;
      for (const cand of cohortCandidates) {
        const count = votesPerCandidate.get(cand.id) || 0;
        if (count > maxVotes) {
          maxVotes = count;
        }
      }

      // Check leaders
      const leaders = maxVotes > 0 ? cohortCandidates.filter((c) => (votesPerCandidate.get(c.id) || 0) === maxVotes) : [];
      let status: 'none' | 'winner' | 'tie' = 'none';
      if (leaders.length === 1) {
        status = 'winner';
      } else if (leaders.length > 1) {
        status = 'tie';
      }

      const candidateResults: CandidateResult[] = cohortCandidates
        .map((c) => {
          const voteCount = votesPerCandidate.get(c.id) || 0;
          const percentage = totalCohortVotes > 0 ? Math.round((voteCount / totalCohortVotes) * 1000) / 10 : 0;
          const isWinner = status === 'winner' && leaders[0]?.id === c.id;
          const isTied = status === 'tie' && leaders.some((l) => l.id === c.id);
          return {
            id: c.id,
            nameEn: c.nameEn,
            nameAr: c.nameAr,
            votes: voteCount,
            percentage,
            isWinner,
            isTied,
          };
        })
        .sort((a, b) => b.votes - a.votes || a.nameEn.localeCompare(b.nameEn));

      return {
        cohort,
        totalVotes: totalCohortVotes,
        eligibleCount: eligible,
        turnoutPercentage,
        candidates: candidateResults,
        status,
        winnerNamesEn: leaders.map((l) => l.nameEn),
        winnerNamesAr: leaders.map((l) => l.nameAr),
      };
    });
}

/**
 * Random receipt code (e.g. SPU-DENT-A4B7-C9E2). It is a reference for the student, not a proof: it cannot be derived from the ID.
 */
export function generateReceiptCode(): string {
  const hex = globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(16).toUpperCase().padStart(8, '0');
  return `SPU-DENT-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
