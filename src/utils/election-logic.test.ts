import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDigits,
  normalizeUniId,
  normalizeArabicName,
  validateStudentName,
  findCohortForId,
  calculateElectionResults,
  generateReceiptCode,
  type Cohort,
  type Candidate,
  type Vote,
} from './election-logic.ts';

const mockCohorts: Cohort[] = [
  { id: 'c1', prefix: '226', labelEn: 'Year 1 (26/27)', labelAr: 'السنة الأولى (26/27)', academicYear: 1 },
  { id: 'c2', prefix: '225', labelEn: 'Year 2 (25/26)', labelAr: 'السنة الثانية (25/26)', academicYear: 2 },
  { id: 'c3', prefix: '224', labelEn: 'Year 3 (24/25)', labelAr: 'السنة الثالثة (24/25)', academicYear: 3 },
  { id: 'c4', prefix: '223', labelEn: 'Year 4 (23/24)', labelAr: 'السنة الرابعة (23/24)', academicYear: 4 },
  { id: 'c5', prefix: '222', labelEn: 'Year 5 (22/23)', labelAr: 'السنة الخامسة (22/23)', academicYear: 5 },
];

test('normalizeDigits converts Arabic-Indic digits to ASCII', () => {
  assert.equal(normalizeDigits('٢٢٤٠٢٠٧'), '2240207');
  assert.equal(normalizeDigits('  ۲۲۴۰۲۰۷  '), '2240207');
  assert.equal(normalizeDigits('2240207'), '2240207');
});

test('normalizeUniId removes non-numeric characters', () => {
  assert.equal(normalizeUniId('ID: 224-0207'), '2240207');
  assert.equal(normalizeUniId('٢٢٤ ٠٢٠٧'), '2240207');
});

test('normalizeArabicName unifies hamzas, tashkeel, and letter variations', () => {
  // Alef variations and tashkeel
  assert.equal(normalizeArabicName('أَحْمَدُ عَلِيّ'), 'احمد علي');
  assert.equal(normalizeArabicName('إبراهيم إسماعيل'), 'ابراهيم اسماعيل');
  // Taa marbuta and Alef Maqsura
  assert.equal(normalizeArabicName('فاطمة مصطفى'), 'فاطمه مصطفي');
  assert.equal(normalizeArabicName('   عُمَر   خَالِد   '), 'عمر خالد');
});

test('validateStudentName enforces minimum 2 words and valid letters', () => {
  assert.equal(validateStudentName('Ahmad').valid, false);
  assert.equal(validateStudentName('Ahmad Ali').valid, true);
  assert.equal(validateStudentName('أحمد خالد العلي').valid, true);
  assert.equal(validateStudentName('').valid, false);
  assert.equal(validateStudentName('Ahmad 1234').valid, false);
});

test('findCohortForId correctly detects academic year from prefix', () => {
  // Year 3 (prefix 224)
  const cohort3 = findCohortForId('2240207', mockCohorts);
  assert.ok(cohort3);
  assert.equal(cohort3?.prefix, '224');
  assert.equal(cohort3?.academicYear, 3);

  // Year 1 (prefix 226)
  const cohort1 = findCohortForId('2260150', mockCohorts);
  assert.ok(cohort1);
  assert.equal(cohort1?.academicYear, 1);

  // Unknown prefix
  const unknown = findCohortForId('2990001', mockCohorts);
  assert.equal(unknown, null);
});

test('calculateElectionResults declares single winner and handles ties', () => {
  const candidates: Candidate[] = [
    { id: 'cand1', cohortId: 'c3', nameEn: 'Omar Khatib', nameAr: 'عمر الخطيب' },
    { id: 'cand2', cohortId: 'c3', nameEn: 'Lina Shammas', nameAr: 'لينا شماس' },
  ];

  const votes: Vote[] = [
    { id: 'v1', uniId: '2240001', studentName: 'Ahmad 1', cohortId: 'c3', candidateId: 'cand1', timestamp: 100, receiptCode: 'R1' },
    { id: 'v2', uniId: '2240002', studentName: 'Ahmad 2', cohortId: 'c3', candidateId: 'cand1', timestamp: 101, receiptCode: 'R2' },
    { id: 'v3', uniId: '2240003', studentName: 'Ahmad 3', cohortId: 'c3', candidateId: 'cand2', timestamp: 102, receiptCode: 'R3' },
  ];

  const results = calculateElectionResults(mockCohorts, candidates, votes, { c3: 200 });
  const y3 = results.find((r) => r.cohort.id === 'c3');
  assert.ok(y3);
  assert.equal(y3?.totalVotes, 3);
  assert.equal(y3?.turnoutPercentage, 1.5); // 3 / 200 = 1.5%
  assert.equal(y3?.status, 'winner');
  assert.deepEqual(y3?.winnerNamesEn, ['Omar Khatib']);
  assert.equal(y3?.candidates[0].isWinner, true);
  assert.equal(y3?.candidates[0].votes, 2);
  assert.equal(y3?.candidates[1].votes, 1);
});

test('calculateElectionResults handles tie votes correctly', () => {
  const candidates: Candidate[] = [
    { id: 'cand1', cohortId: 'c3', nameEn: 'Omar Khatib', nameAr: 'عمر الخطيب' },
    { id: 'cand2', cohortId: 'c3', nameEn: 'Lina Shammas', nameAr: 'لينا شماس' },
  ];

  const votes: Vote[] = [
    { id: 'v1', uniId: '2240001', studentName: 'Ahmad 1', cohortId: 'c3', candidateId: 'cand1', timestamp: 100, receiptCode: 'R1' },
    { id: 'v2', uniId: '2240002', studentName: 'Ahmad 2', cohortId: 'c3', candidateId: 'cand2', timestamp: 101, receiptCode: 'R2' },
  ];

  const results = calculateElectionResults(mockCohorts, candidates, votes);
  const y3 = results.find((r) => r.cohort.id === 'c3');
  assert.ok(y3);
  assert.equal(y3?.status, 'tie');
  assert.equal(y3?.winnerNamesEn.length, 2);
});

test('generateReceiptCode generates formatted code with SPU-DENT prefix', () => {
  const code = generateReceiptCode();
  assert.match(code, /^SPU-DENT-[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test('generateReceiptCode is random, validateStudentName caps length', () => {
  assert.notEqual(generateReceiptCode(), generateReceiptCode());
  assert.equal(validateStudentName('Ahmad ' + 'a'.repeat(200)).valid, false);
});
