import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  Printer,
  RotateCcw,
  UserCheck,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { SpuLogo, DentistrySeal } from './SpuBrand.tsx';
import { Language, translations } from '../utils/i18n.ts';
import { Cohort, Candidate, normalizeUniId, normalizeDigits } from '../utils/election-logic.ts';

// Random per-browser id, sent with the vote only so the committee can see several votes from one phone.
function deviceId(): string | null {
  try {
    let d = localStorage.getItem('dev');
    if (!/^[a-f0-9]{32}$/.test(d || '')) {
      d = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('dev', d);
    }
    return d;
  } catch {
    return null; // storage blocked: the vote still works
  }
}

interface VoterPortalProps {
  lang: Language;
  theme?: 'light' | 'dark';
  onPublicResultsClick: () => void;
  publicResultsEnabled: boolean;
}

export const VoterPortal: React.FC<VoterPortalProps> = ({
  lang,
  theme = 'light',
  onPublicResultsClick,
  publicResultsEnabled,
}) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isDark = theme === 'dark';

  // Election Status
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [statusCohorts, setStatusCohorts] = useState<Cohort[]>([]);

  // Step state: 1: Details, 2: Choose Candidate, 3: Confirm, 4: Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Inputs
  const [fullName, setFullName] = useState<string>('');
  const [uniId, setUniId] = useState<string>('');
  const [detectedCohort, setDetectedCohort] = useState<Cohort | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Submission & Receipt state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receiptCode: string;
    timestamp: number;
    candidateNameEn: string;
    candidateNameAr: string;
    cohortLabelEn: string;
    cohortLabelAr: string;
  } | null>(null);

  // Load status
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setIsOpen(data.open);
        if (data.cohorts) {
          setStatusCohorts(data.cohorts);
        }
        setLoadingStatus(false);
      })
      .catch((err) => {
        console.error('Failed to load status:', err);
        setLoadingStatus(false);
      });
  }, []);

  const cleanId = normalizeUniId(uniId);
  useEffect(() => {
    setErrorMsg(null);
  }, [fullName, uniId, selectedCandidateId]);

  // Handle Step 1 Verification Submission
  const handleVerifyStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, uniId: cleanId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setDetectedCohort(data.cohort);
      setCandidates(data.candidates);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error checking eligibility');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 3 Final Vote Submission
  const handleFinalVoteSubmit = async () => {
    if (!selectedCandidateId) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          uniId: cleanId,
          candidateId: selectedCandidateId,
          device: deviceId(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      setReceiptData({
        receiptCode: data.receiptCode,
        timestamp: data.timestamp,
        candidateNameEn: data.candidateNameEn,
        candidateNameAr: data.candidateNameAr,
        cohortLabelEn: data.cohort?.labelEn || '',
        cohortLabelAr: data.cohort?.labelAr || '',
      });
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record vote');
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFullName('');
    setUniId('');
    setSelectedCandidateId(null);
    setDetectedCohort(null);
    setCandidates([]);
    setReceiptData(null);
    setErrorMsg(null);
    setStep(1);
  };

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* University & Faculty Header */}
      <div
        className={`rounded-3xl p-6 md:p-8 mb-6 text-center relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#111827] shadow-xl border border-slate-800/90 text-white'
            : 'bg-white shadow-sm border border-slate-200/90 text-slate-900'
        }`}
      >
        {/* Subtle background glow */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 rounded-full blur-3xl pointer-events-none ${
            isDark ? 'bg-blue-600/10' : 'bg-blue-500/5'
          }`}
        />

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-5">
          <SpuLogo size="md" />
          <div className={`h-12 w-px hidden sm:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <DentistrySeal size="md" />
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-3 ${
            isDark
              ? 'bg-blue-950/70 text-blue-300 border border-blue-800/80'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-500" />
          <span>{t.facultyName} • {t.universityName}</span>
        </div>

        <h1 className={`text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t.councilElection}
        </h1>
        <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {t.systemSubtitle}
        </p>

        {/* Status Pill */}
        <div className="mt-5 flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${
              isOpen
                ? isDark
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : isDark
                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isOpen ? t.votingOpen : t.votingClosed}
          </span>

          {publicResultsEnabled && (
            <button
              onClick={onPublicResultsClick}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {t.publicResults}
            </button>
          )}
        </div>
      </div>

      {/* Closed Notice */}
      {!loadingStatus && !isOpen && (
        <div
          className={`border rounded-3xl p-6 text-center mb-6 shadow-lg ${
            isDark
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">{t.votingClosed}</h2>
          <p className="text-sm max-w-md mx-auto mb-3">{t.votingClosedNotice}</p>
          <p className="text-xs opacity-80">{t.votingClosedHelp}</p>
        </div>
      )}

      {/* Active Voting Flow */}
      {isOpen && (
        <div
          className={`rounded-3xl p-6 sm:p-8 transition-colors ${
            isDark
              ? 'bg-[#111827] shadow-xl border border-slate-800/90'
              : 'bg-white shadow-sm border border-slate-200/90'
          }`}
        >
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className={`flex items-center justify-between text-xs font-medium mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={step >= 1 ? 'text-blue-500 font-bold' : ''}>1. {isRtl ? 'التحقق' : 'Verification'}</span>
              <span className={step >= 2 ? 'text-blue-500 font-bold' : ''}>2. {isRtl ? 'المرشح' : 'Candidate'}</span>
              <span className={step >= 3 ? 'text-blue-500 font-bold' : ''}>3. {isRtl ? 'التأكيد' : 'Confirm'}</span>
              <span className={step === 4 ? 'text-emerald-500 font-bold' : ''}>4. {isRtl ? 'الإيصال' : 'Receipt'}</span>
            </div>
            <div className={`h-2 w-full rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800/90' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">{isRtl ? 'تنبيه أمان / خطأ' : 'Verification Notice'}</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Student Information & Automated Year Matching */}
          {step === 1 && (
            <form onSubmit={handleVerifyStep1} className="space-y-6">
              <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  {t.step1Title}
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step1Desc}</p>
              </div>

              {/* Academic Years Active Status Badge */}
              {statusCohorts.length > 0 && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between flex-wrap gap-2 ${
                    statusCohorts.some((c) => c.open === false)
                      ? isDark
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                      : isDark
                      ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      {isRtl ? 'حالة فتح التصويت للدفعات:' : 'Academic Year Voting Status:'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {statusCohorts.map((c) => {
                      const cOpen = c.open !== false;
                      return (
                        <span
                          key={c.id}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            cOpen
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isRtl ? c.labelAr : c.labelEn}: {cOpen ? (isRtl ? 'مفتوح 🟢' : 'Open 🟢') : (isRtl ? 'مغلق 🔴' : 'Closed 🔴')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="fullNameInput" className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.fullNameLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="fullNameInput"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-4 py-3.5 rounded-2xl border outline-none text-base transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/90 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'border-slate-300 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  dir="auto"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="uniIdInput" className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.uniIdLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="uniIdInput"
                  type="text"
                  required
                  maxLength={10}
                  value={uniId}
                  onChange={(e) => setUniId(normalizeDigits(e.target.value))}
                  className={`w-full px-4 py-3.5 rounded-2xl border outline-none text-base font-mono tracking-wider transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/90 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'border-slate-300 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              {/* Automated Prefix Detection Hint Box */}
              {cleanId.length >= 3 && (
                <div
                  className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${
                    isDark
                      ? 'bg-blue-950/40 border border-blue-800/60 text-blue-200'
                      : 'bg-blue-50/90 border border-blue-200 text-blue-950'
                  }`}
                >
                  <GraduationCap className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.detectedYear} </span>
                    <span className="font-bold text-blue-500 underline decoration-blue-500 underline-offset-2">
                      {cleanId.startsWith('224')
                        ? isRtl ? 'السنة الثالثة (دفعة 24/25)' : 'Year 3 (Intake 24/25)'
                        : cleanId.startsWith('225')
                        ? isRtl ? 'السنة الثانية (دفعة 25/26)' : 'Year 2 (Intake 25/26)'
                        : cleanId.startsWith('223')
                        ? isRtl ? 'السنة الرابعة (دفعة 23/24)' : 'Year 4 (Intake 23/24)'
                        : cleanId.startsWith('222')
                        ? isRtl ? 'السنة الخامسة (دفعة 22/23)' : 'Year 5 (Intake 22/23)'
                        : cleanId.startsWith('226')
                        ? isRtl ? 'السنة الأولى (دفعة 26/27)' : 'Year 1 (Intake 26/27)'
                        : isRtl ? 'بادئة غير معتادة - سيتم التحقق بالخادم' : 'Custom cohort prefix'}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !fullName.trim() || cleanId.length !== 7}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>{isRtl ? 'جارٍ التحقق...' : 'Verifying...'}</span>
                ) : (
                  <>
                    <span>{t.continueBtn}</span>
                    {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Candidate Selection */}
          {step === 2 && detectedCohort && (
            <div className="space-y-6">
              <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <FileCheck2 className="w-5 h-5 text-blue-500" />
                    {t.step2Title}
                  </h2>
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                      isDark
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {isRtl ? detectedCohort.labelAr : detectedCohort.labelEn}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step2Desc}</p>
              </div>

              {/* Student info strip */}
              <div
                className={`rounded-2xl p-3.5 border text-xs sm:text-sm flex justify-between items-center ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>
                  <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{fullName}</strong> ({cleanId})
                </span>
                <span className="text-blue-500 font-semibold">{t.oneVoteNotice}</span>
              </div>

              {/* Candidates List */}
              <div className="space-y-3">
                <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.selectCandidate}
                </label>
                {candidates.length === 0 ? (
                  <p
                    className={`text-center py-8 text-sm rounded-2xl border ${
                      isDark
                        ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {t.noCandidates}
                  </p>
                ) : (
                  candidates.map((cand) => {
                    const isSelected = selectedCandidateId === cand.id;
                    const candName = isRtl ? cand.nameAr : cand.nameEn;
                    const slogan = isRtl ? cand.sloganAr : cand.sloganEn;

                    return (
                      <div
                        key={cand.id}
                        onClick={() => setSelectedCandidateId(cand.id)}
                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                          isSelected
                            ? isDark
                              ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-950/40'
                              : 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20'
                            : isDark
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                            : 'border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/70'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600'
                              : isDark
                              ? 'border-slate-600 bg-slate-900'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>

                        {/* Monogram */}
                        <div
                          className={`w-12 h-12 rounded-2xl font-bold flex items-center justify-center text-base shrink-0 border ${
                            isDark
                              ? 'bg-slate-800 text-blue-400 border-slate-700'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {candName.slice(0, 2)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-base leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{candName}</h3>
                          {slogan && <p className={`text-xs sm:text-sm line-clamp-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{slogan}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`px-5 py-3.5 rounded-2xl border font-semibold text-sm transition cursor-pointer ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.backBtn}
                </button>
                <button
                  type="button"
                  disabled={!selectedCandidateId}
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>{t.confirmBtn}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Final Confirmation */}
          {step === 3 && selectedCandidate && detectedCohort && (
            <div className="space-y-6">
              <div className={`border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  {t.confirmModalTitle}
                </h2>
                <p className="text-sm text-rose-500 font-medium mt-1">{t.confirmModalWarning}</p>
              </div>

              <div className={`rounded-2xl p-5 border space-y-4 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.voterSummary}
                  </h4>
                  <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{fullName}</p>
                  <p className={`text-sm font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t.uniIdLabel}: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{cleanId}</strong>
                  </p>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t.academicYearLabel}{' '}
                    <strong className="text-blue-500">
                      {isRtl ? detectedCohort.labelAr : detectedCohort.labelEn}
                    </strong>
                  </p>
                </div>

                <div className={`border-t pt-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.candidateSummary}
                  </h4>
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-slate-900 border-blue-900/50' : 'bg-white border-blue-200 shadow-xs'}`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200">
                      {(isRtl ? selectedCandidate.nameAr : selectedCandidate.nameEn).slice(0, 2)}
                    </div>
                    <div>
                      <p className={`font-extrabold text-base ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                        {isRtl ? selectedCandidate.nameAr : selectedCandidate.nameEn}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isRtl ? selectedCandidate.sloganAr : selectedCandidate.sloganEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className={`px-5 py-3.5 rounded-2xl border font-semibold text-sm transition cursor-pointer ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={handleFinalVoteSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isSubmitting ? t.submitting : t.submitVoteBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Official Digital Cryptographic Receipt */}
          {step === 4 && receiptData && (
            <div className="space-y-6 text-center py-4">
              <div
                className={`w-16 h-16 rounded-full border mx-auto flex items-center justify-center shadow-md ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.receiptTitle}</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.receiptSubtitle}</p>
              </div>

              {/* Official Receipt Card */}
              <div
                id="printableReceipt"
                className={`rounded-2xl p-6 border-2 border-emerald-500/70 shadow-xl text-left max-w-md mx-auto relative overflow-hidden ${
                  isDark
                    ? 'bg-gradient-to-b from-slate-900 to-[#0b0f19] text-white'
                    : 'bg-white text-slate-900'
                }`}
                dir="ltr"
              >
                <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2.5">
                    <DentistrySeal size="sm" />
                    <div>
                      <p className={`font-bold text-xs leading-tight ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>SPU FACULTY OF DENTISTRY</p>
                      <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>OFFICIAL VOTER RECEIPT</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.receiptCodeLabel}</span>
                    <span
                      className={`font-mono text-base font-black tracking-wider px-2.5 py-1 rounded-lg inline-block border mt-1 ${
                        isDark
                          ? 'text-blue-200 bg-blue-950/80 border-blue-800'
                          : 'text-blue-900 bg-blue-50 border-blue-200'
                      }`}
                    >
                      {receiptData.receiptCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.uniIdLabel}:</span>
                      <strong className={`font-mono text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{cleanId}</strong>
                    </div>
                    <div>
                      <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isRtl ? 'السنة الدراسية:' : 'Year:'}</span>
                      <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                        {isRtl ? receiptData.cohortLabelAr : receiptData.cohortLabelEn}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className={`block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.timestampLabel}</span>
                    <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {new Date(receiptData.timestamp).toLocaleString(isRtl ? 'ar-SY' : 'en-US')}
                    </span>
                  </div>
                </div>

                <div className={`mt-5 pt-3 border-t text-center text-[10px] ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
                  Secured by SPU Dental Election Committee • 1 Vote Cast
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-5 py-2.5 rounded-xl border font-semibold text-sm transition inline-flex items-center gap-2 cursor-pointer ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.printReceiptBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.doneBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clean Footer (No admin button visible for voters) */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <span>© {new Date().getFullYear()} {t.universityName} - {t.facultyName}</span>
      </footer>
    </div>
  );
};
