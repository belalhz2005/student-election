import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Vote as VoteIcon,
  ShieldAlert,
  Settings,
  Download,
  QrCode,
  Play,
  Pause,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  Sparkles,
  Printer,
  ChevronRight,
  ExternalLink,
  FileText,
  Edit3,
  Save,
  X,
  Check,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { SpuLogo, DentistrySeal } from './SpuBrand.tsx';
import { Language, translations } from '../utils/i18n.ts';
import { Cohort, Candidate, CohortResult } from '../utils/election-logic.ts';
import { generateElectionResultsPdf } from '../utils/pdf-export.ts';

interface AdminPortalProps {
  lang: Language;
  theme?: 'light' | 'dark';
  onBackToVoter: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ lang, theme = 'light', onBackToVoter }) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isDark = theme === 'dark';

  // Admin Auth State
  // The session lives in an HttpOnly cookie; 'session' only records that the server accepted it.
  const [token, setToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'results' | 'voters' | 'setup' | 'security' | 'tools'>('results');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [state, setState] = useState<{
    open: boolean;
    publicResults: boolean;
    strictRosterOnly: boolean;
    idLength: number;
    totalVotes: number;
    rosterCount: number;
    cohorts: Cohort[];
    candidates: Candidate[];
    results: CohortResult[];
    voters: Array<{
      id: string;
      uniId: string;
      studentName: string;
      cohortId: string;
      timestamp: number;
      receiptCode: string;
      nameMismatch: boolean;
      sameDevice: number;
    }>;
    attempts: Array<{
      id: string;
      timestamp: number;
      uniId: string;
      name: string;
      reason: string;
      ip: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } | null>(null);

  // Filters for Voters Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>('all');

  // Forms State
  const [newCandCohortId, setNewCandCohortId] = useState<string>('');
  const [newCandNameAr, setNewCandNameAr] = useState<string>('');
  const [newCandNameEn, setNewCandNameEn] = useState<string>('');
  const [newCandSloganAr, setNewCandSloganAr] = useState<string>('');
  const [newCandSloganEn, setNewCandSloganEn] = useState<string>('');

  const [newCohortPrefix, setNewCohortPrefix] = useState<string>('');
  const [newCohortLabelAr, setNewCohortLabelAr] = useState<string>('');
  const [newCohortLabelEn, setNewCohortLabelEn] = useState<string>('');
  const [newCohortYear, setNewCohortYear] = useState<number>(1);

  const [rosterText, setRosterText] = useState<string>('');
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [qrModalData, setQrModalData] = useState<{ url: string; qrDataUrl: string } | null>(null);

  // Candidate deletion state
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState<boolean>(false);
  const [deletingCandId, setDeletingCandId] = useState<string | null>(null);
  const [isWipingAllCand, setIsWipingAllCand] = useState<boolean>(false);

  // Cohort editing state (editable prefixes & labels)
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [editCohortPrefix, setEditCohortPrefix] = useState<string>('');
  const [editCohortLabelAr, setEditCohortLabelAr] = useState<string>('');
  const [editCohortLabelEn, setEditCohortLabelEn] = useState<string>('');
  const [editCohortYear, setEditCohortYear] = useState<number>(1);
  const [isSavingCohort, setIsSavingCohort] = useState<boolean>(false);

  // Fetch admin state
  const fetchState = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/state');
      if (res.status === 401) {
        setToken(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch state');
      setToken('session');
      setState(data);
      if (!newCandCohortId && data.cohorts.length > 0) {
        setNewCandCohortId(data.cohorts[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setPasswordInput('');
      await fetchState();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setToken(null);
    setState(null);
  };

  // Toggle Election Open/Close
  const handleToggleOpen = async () => {
    if (!state) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ open: !state.open }),
      });
      if (!res.ok) throw new Error('Failed to update election status');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Toggle Public Results
  const handleTogglePublicResults = async () => {
    if (!state) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicResults: !state.publicResults }),
      });
      if (!res.ok) throw new Error('Failed to update public results');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Export Results in PDF
  const handleExportPdf = () => {
    if (!state) return;
    try {
      const doc = generateElectionResultsPdf({
        results: state.results,
        totalVotes: state.totalVotes,
        isOpen: state.open,
      });
      doc.save('SPU_Faculty_of_Dentistry_Election_Results.pdf');
    } catch (err: any) {
      setErrorMsg('Failed to generate PDF: ' + err.message);
    }
  };

  // Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cohortId: newCandCohortId,
          nameAr: newCandNameAr,
          nameEn: newCandNameEn,
          sloganAr: newCandSloganAr,
          sloganEn: newCandSloganEn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewCandNameAr('');
      setNewCandNameEn('');
      setNewCandSloganAr('');
      setNewCandSloganEn('');
      setSuccessMsg('Candidate added successfully');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Delete Candidate (non-blocking, direct and reliable)
  const handleDeleteCandidate = async (candidateId: string) => {
    setErrorMsg(null);
    setIsDeletingCandidate(true);
    try {
      const res = await fetch('/api/admin/candidate/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: candidateId, candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove candidate');
      setCandidateToDelete(null);
      setDeletingCandId(null);
      setSuccessMsg(t.candidateDeleted || (isRtl ? 'تم حذف المرشح بنجاح' : 'Candidate removed successfully'));
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove candidate');
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  // Clear All Candidates
  const handleClearAllCandidates = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/candidate/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear candidates');
      setIsWipingAllCand(false);
      setSuccessMsg('All candidates cleared successfully');
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Start editing cohort prefix & details
  const startEditingCohort = (cohort: Cohort) => {
    setEditingCohortId(cohort.id);
    setEditCohortPrefix(cohort.prefix);
    setEditCohortLabelAr(cohort.labelAr);
    setEditCohortLabelEn(cohort.labelEn);
    setEditCohortYear(cohort.academicYear);
  };

  // Cancel editing cohort
  const cancelEditingCohort = () => {
    setEditingCohortId(null);
  };

  // Save edited cohort prefix & details
  const handleSaveCohort = async (cohortId: string) => {
    if (!editCohortPrefix.trim()) {
      setErrorMsg('Prefix cannot be empty');
      return;
    }
    setIsSavingCohort(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/cohort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cohortId,
          prefix: editCohortPrefix.trim(),
          labelAr: editCohortLabelAr.trim(),
          labelEn: editCohortLabelEn.trim(),
          academicYear: editCohortYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update academic year');
      setEditingCohortId(null);
      setSuccessMsg(t.cohortUpdated || 'Academic year prefix updated successfully');
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSavingCohort(false);
    }
  };

  // Toggle voting for a specific cohort
  const handleToggleCohortVoting = async (cohortId: string, currentOpen?: boolean) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/cohort/toggle-voting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cohortId, open: currentOpen === false ? true : false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update cohort voting state');
      setSuccessMsg(
        data.cohort.open !== false
          ? (isRtl ? `تم فتح التصويت لـ ${data.cohort.labelAr}` : `Voting opened for ${data.cohort.labelEn}`)
          : (isRtl ? `تم إغلاق التصويت لـ ${data.cohort.labelAr}` : `Voting paused for ${data.cohort.labelEn}`)
      );
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling cohort voting');
    }
  };

  // Bulk toggle voting for all cohorts
  const handleBulkToggleCohortVoting = async (open: boolean) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/cohorts/bulk-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ open }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update all cohorts');
      setSuccessMsg(
        open
          ? (isRtl ? 'تم فتح التصويت لجميع السنوات الدراسية' : 'Voting opened for all academic years')
          : (isRtl ? 'تم إغلاق التصويت لجميع السنوات الدراسية' : 'Voting paused for all academic years')
      );
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling all cohorts');
    }
  };

  // Open voting ONLY for a single cohort (close all other academic years)
  const handleOpenSingleCohortVoting = async (cohortId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/cohorts/open-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cohortId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set active year');
      setSuccessMsg(
        isRtl
          ? `تم فتح التصويت حصرياً لـ ${data.activeCohort.labelAr} وإغلاق بقية الدفعات.`
          : `Voting opened exclusively for ${data.activeCohort.labelEn}.`
      );
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error opening single year');
    }
  };

  // Add Cohort
  const handleAddCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/cohort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: newCohortPrefix,
          labelAr: newCohortLabelAr,
          labelEn: newCohortLabelEn,
          academicYear: newCohortYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewCohortPrefix('');
      setNewCohortLabelAr('');
      setNewCohortLabelEn('');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Import Roster
  const handleImportRoster = async (replaceAll: boolean) => {
    if (!rosterText.trim()) return;
    try {
      const res = await fetch('/api/admin/roster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: rosterText, replaceAll }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(`Imported ${data.importedCount} students (Skipped: ${data.skippedCount})`);
      setRosterText('');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Reset Election
  const handleResetElection = async () => {
    if (resetConfirmInput !== 'RESET_ELECTION') {
      setErrorMsg('Please type RESET_ELECTION to confirm.');
      return;
    }
    try {
      const res = await fetch('/api/admin/reset-votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: resetConfirmInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('Election ballots reset successfully.');
      setResetConfirmInput('');
      fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Cancel a single vote so the student can vote again
  const handleCancelVote = async (uniId: string) => {
    if (!confirm(t.confirmCancelVote)) return;
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/vote/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Show QR
  const handleOpenQrModal = async () => {
    try {
      const res = await fetch('/api/admin/qr');
      const data = await res.json();
      setQrModalData(data);
    } catch (err: any) {
      setErrorMsg('Failed to load QR code');
    }
  };

  // Filtered voters list
  const filteredVoters = (state?.voters || []).filter((v) => {
    const matchesCohort = selectedCohortFilter === 'all' || v.cohortId === selectedCohortFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.uniId.toLowerCase().includes(q) ||
      v.studentName.toLowerCase().includes(q) ||
      v.receiptCode.toLowerCase().includes(q);
    return matchesCohort && matchesQuery;
  });

  const totalVotes = state?.totalVotes || 0;
  const rosterCount = state?.rosterCount || 0;
  const overallTurnout = rosterCount > 0 ? Math.round((totalVotes / rosterCount) * 1000) / 10 : null;

  // Not logged in -> Show Login View
  if (!token && loading) return <div className="min-h-[85vh]" />;
  if (!token) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-md rounded-3xl p-8 sm:p-10 relative overflow-hidden transition-colors ${
            isDark
              ? 'bg-[#111827] shadow-2xl border border-slate-800 text-white'
              : 'bg-white shadow-xl border border-slate-200 text-slate-900'
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
              isDark ? 'bg-blue-600/10' : 'bg-blue-500/10'
            }`}
          />

          <div className="text-center mb-6 relative">
            <DentistrySeal size="lg" className="mx-auto mb-3" />
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-2.5 ${
                isDark
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.adminLoginTitle}</span>
            </div>
            <h2 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.facultyName}</h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.councilElection}</p>
          </div>

          {loginError && (
            <div
              className={`mb-5 p-3.5 rounded-2xl border text-sm flex items-center gap-2.5 ${
                isDark
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.passwordLabel}
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full px-4 py-3 rounded-2xl border outline-none text-sm transition ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                }`}
                dir="ltr"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoggingIn ? 'Logging in...' : t.loginBtn}</span>
            </button>

            <button
              type="button"
              onClick={onBackToVoter}
              className={`w-full py-2.5 text-xs font-medium transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ← {t.studentPortal}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top Bar Navigation */}
      <div
        className={`rounded-3xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isDark
            ? 'bg-[#111827] shadow-xl border border-slate-800 text-white'
            : 'bg-white shadow-sm border border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <DentistrySeal size="sm" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className={`text-lg font-extrabold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.dashboardTitle}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                  state?.open
                    ? isDark
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isDark
                    ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {state?.open ? t.votingOpen : t.votingClosed}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.facultyName} • {t.universityName}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleToggleOpen}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              state?.open
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900/80'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {state?.open ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{state?.open ? t.closeVotingBtn : t.openVotingBtn}</span>
          </button>

          <button
            onClick={handleOpenQrModal}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            <span>QR</span>
          </button>

          <button
            onClick={onBackToVoter}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.studentPortal}</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 border border-slate-800 transition cursor-pointer"
            title={t.logoutBtn}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Notifications */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 font-bold ml-2">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold ml-2">✕</button>
        </div>
      )}

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center justify-between mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="text-xs font-semibold">{t.totalVotesCast}</span>
            <VoteIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalVotes}</p>
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{state?.open ? 'Live polling active' : 'Polling paused'}</span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center justify-between mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="text-xs font-semibold">{t.registeredRoster}</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{rosterCount || 'Open'}</p>
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {rosterCount ? 'Students enrolled' : 'All valid prefixes'}
          </span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center justify-between mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="text-xs font-semibold">{t.turnoutRate}</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {overallTurnout !== null ? `${overallTurnout}%` : 'N/A'}
          </p>
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {rosterCount ? `${totalVotes} of ${rosterCount}` : 'Roster not uploaded'}
          </span>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className={`flex items-center justify-between mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="text-xs font-semibold">{t.participatingYears}</span>
            <ShieldAlert className="w-4 h-4 text-purple-500" />
          </div>
          <p className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{state?.cohorts.length || 5}</p>
          <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1 Winner per Year</span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 rounded-t-2xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'results'
              ? 'border-blue-500 text-blue-400 bg-blue-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t.tabResults}</span>
        </button>

        <button
          onClick={() => setActiveTab('voters')}
          className={`px-4 py-2.5 rounded-t-2xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'voters'
              ? 'border-blue-500 text-blue-400 bg-blue-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.tabVoters}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {state?.voters.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2.5 rounded-t-2xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'setup'
              ? 'border-blue-500 text-blue-400 bg-blue-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t.tabSetup}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-t-2xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'security'
              ? 'border-blue-500 text-blue-400 bg-blue-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t.tabSecurity}</span>
          {state && state.attempts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-400 border border-rose-800 font-bold">
              {state.attempts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2.5 rounded-t-2xl text-sm font-bold transition whitespace-nowrap flex items-center gap-2 border-b-2 cursor-pointer ${
            activeTab === 'tools'
              ? 'border-blue-500 text-blue-400 bg-blue-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t.tabTools}</span>
        </button>
      </div>

      {/* TAB 1: RESULTS & WINNERS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>{t.tabResults} (One Winner Elected Per Academic Year)</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePublicResults}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  state?.publicResults
                    ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Public Results: {state?.publicResults ? 'Enabled' : 'Hidden'}
              </button>

              {/* PDF EXPORT BUTTON */}
              <button
                onClick={handleExportPdf}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.exportPdfBtn}</span>
              </button>

              {/* CSV Export Option */}
              <a
                href="/api/admin/export/results.csv"
                download
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </a>
            </div>
          </div>

          {/* SELECTIVE YEAR VOTING CONTROL PANEL */}
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <h3 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span>{t.yearControlPanelTitle}</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.yearControlPanelSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleBulkToggleCohortVoting(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t.openAllYears}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggleCohortVoting(false)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{t.closeAllYears}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
              {(state?.cohorts || []).map((c) => {
                const isOpenThis = c.open !== false;
                return (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-2xl border transition flex flex-col justify-between gap-2 ${
                      isOpenThis
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isRtl ? c.labelAr : c.labelEn}
                      </span>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOpenThis ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleCohortVoting(c.id, c.open)}
                        className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold transition text-center cursor-pointer border ${
                          isOpenThis
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300'
                        }`}
                      >
                        {isOpenThis ? (isRtl ? 'إغلاق' : 'Pause') : (isRtl ? 'فتح' : 'Open')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSingleCohortVoting(c.id)}
                        title={isRtl ? `فتح التصويت لـ ${c.labelAr} فقط وإغلاق باقي الدفعات` : `Open voting for ${c.labelEn} ONLY`}
                        className="py-1 px-2 rounded-xl text-[11px] font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center justify-center gap-1 shadow-xs shrink-0"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isRtl ? 'هي فقط' : 'Only'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(state?.results || []).map((cohortRes) => {
              const cohort = cohortRes.cohort;
              const hasWinner = cohortRes.status === 'winner';
              const isTied = cohortRes.status === 'tie';
              const maxVotes = Math.max(1, ...cohortRes.candidates.map((c) => c.votes));

              return (
                <div
                  key={cohort.id}
                  className={`rounded-3xl p-5 sm:p-6 border shadow-sm relative overflow-hidden transition ${
                    isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isDark ? 'text-blue-400 bg-blue-950/80 border-blue-800' : 'text-blue-700 bg-blue-50 border-blue-200'
                      }`}>
                        Prefix: {cohort.prefix}xxxx
                      </span>
                      <h3 className={`font-extrabold text-base mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isRtl ? cohort.labelAr : cohort.labelEn}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Votes</span>
                      <span className={`text-xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {cohortRes.totalVotes}
                      </span>
                    </div>
                  </div>

                  {/* Year-Specific Voting Toggle Bar */}
                  <div className="flex items-center justify-between gap-2 mb-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {cohort.open !== false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{t.yearVotingOpen}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>{t.yearVotingClosed}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleCohortVoting(cohort.id, cohort.open)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                          cohort.open !== false
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300'
                        }`}
                      >
                        {cohort.open !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>
                          {cohort.open !== false
                            ? (isRtl ? 'إغلاق التصويت' : 'Pause Year')
                            : (isRtl ? 'فتح التصويت' : 'Open Year')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSingleCohortVoting(cohort.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1 shadow-xs cursor-pointer"
                        title={isRtl ? `فتح التصويت لـ ${cohort.labelAr} فقط وإغلاق بقية السنوات` : `Open voting for ${cohort.labelEn} ONLY`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.openOnlyThisYear}</span>
                      </button>
                    </div>
                  </div>

                  {/* Winner / Outcome Banner */}
                  <div className="mb-4">
                    {hasWinner ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-600 dark:text-emerald-300">
                        <Trophy className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <span className="text-xs font-bold block">{t.winnerDeclared}</span>
                          <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-200">
                            {isRtl ? cohortRes.winnerNamesAr.join(', ') : cohortRes.winnerNamesEn.join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : isTied ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-amber-600 dark:text-amber-300">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-xs font-bold block">{t.tiedResult}</span>
                          <span className="font-extrabold text-sm text-amber-700 dark:text-amber-200">
                            {isRtl ? cohortRes.winnerNamesAr.join(' & ') : cohortRes.winnerNamesEn.join(' & ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-3 border rounded-2xl text-xs text-center ${
                        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        {t.noVotesYet}
                      </div>
                    )}
                  </div>

                  {/* Candidates Bars */}
                  <div className="space-y-3.5">
                    {cohortRes.candidates.map((cand) => {
                      const candName = isRtl ? cand.nameAr : cand.nameEn;
                      const percentage = cand.percentage;
                      const widthPercent = (cand.votes / maxVotes) * 100;

                      return (
                        <div key={cand.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {cand.isWinner && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
                              {candName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <strong className={isDark ? 'text-white' : 'text-slate-900'}>{cand.votes}</strong> votes ({percentage}%)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const fullCand = (state?.candidates || []).find((c) => c.id === cand.id) || {
                                    id: cand.id,
                                    nameAr: cand.nameAr,
                                    nameEn: cand.nameEn,
                                    cohortId: cohort.id,
                                  };
                                  setCandidateToDelete(fullCand as Candidate);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title={t.deleteCandidate}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className={`h-2.5 w-full rounded-full overflow-hidden border ${
                            isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-100 border-slate-200'
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cand.isWinner
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-xs shadow-emerald-500/50'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VOTERS REGISTRY */}
      {activeTab === 'voters' && (
        <div className={`rounded-3xl p-6 border shadow-sm space-y-4 transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.tabVoters}</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Official audit trail of all students who voted with time and cryptographic receipt.
              </p>
            </div>

            <a
              href="/api/admin/export/voters.csv"
              download
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportVotersBtn}</span>
            </a>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>

            <select
              value={selectedCohortFilter}
              onChange={(e) => setSelectedCohortFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs text-slate-200 bg-slate-900"
            >
              <option value="all">{t.filterAllYears}</option>
              {(state?.cohorts || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {isRtl ? c.labelAr : c.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Voters Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">{t.thTime}</th>
                  <th className="py-3 px-3.5">{t.thId}</th>
                  <th className="py-3 px-3.5">{t.thName}</th>
                  <th className="py-3 px-3.5">{t.thYear}</th>
                  <th className="py-3 px-3.5">{t.thReceipt}</th>
                  <th className="py-3 px-3.5">{t.thStatus}</th>
                  <th className="py-3 px-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                {filteredVoters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                      No voters recorded yet. Database is completely clean.
                    </td>
                  </tr>
                ) : (
                  filteredVoters.slice(0, 500).map((v) => {
                    const cohort = state?.cohorts.find((c) => c.id === v.cohortId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px]">
                          {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-white">{v.uniId}</td>
                        <td className="py-3 px-3.5 font-semibold text-slate-200" dir="auto">
                          {v.studentName}
                          {v.sameDevice > 0 && (
                            <span className="ml-2 text-[10px] font-medium text-amber-400" title={`${v.sameDevice} ${t.sameDeviceFlag}`}>📱 {v.sameDevice}</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-slate-400">
                          {cohort ? (isRtl ? cohort.labelAr : cohort.labelEn) : v.cohortId}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-blue-300 bg-blue-950/40 rounded">
                          {v.receiptCode}
                        </td>
                        <td className="py-3 px-3.5">
                          {v.nameMismatch ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{t.nameMismatchFlag}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t.verifiedMatch}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => handleCancelVote(v.uniId)}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            {t.cancelVoteBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC YEARS & CANDIDATES SETUP */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className={`rounded-3xl p-6 border shadow-sm transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Plus className="w-4 h-4 text-blue-500" />
              <span>{t.addCandidateBtn}</span>
            </h3>

            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.academicYearLabel}</label>
                <select
                  value={newCandCohortId}
                  onChange={(e) => setNewCandCohortId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-blue-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                >
                  {(state?.cohorts || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.labelAr : c.labelEn} (Prefix {c.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.candidateNameAr}</label>
                <input
                  type="text"
                  required
                  value={newCandNameAr}
                  onChange={(e) => setNewCandNameAr(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-blue-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                  dir="rtl"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.candidateNameEn}</label>
                <input
                  type="text"
                  value={newCandNameEn}
                  onChange={(e) => setNewCandNameEn(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-blue-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                  dir="ltr"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.sloganAr}</label>
                <input
                  type="text"
                  value={newCandSloganAr}
                  onChange={(e) => setNewCandSloganAr(e.target.value)}
                  placeholder="البرنامج الانتخابي / الشعار"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-blue-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
                  }`}
                  dir="rtl"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addCandidateBtn}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Settings className="w-4 h-4 text-blue-500" />
                <span>{t.manageYears}</span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isRtl
                  ? 'يمكنك التحكم بفتح أو إغلاق التصويت لكل سنة دراسية بشكل مستقل، وتعديل بادئات الأرقام الجامعية.'
                  : 'Control voting status per academic year, edit ID prefixes, and manage candidates.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleBulkToggleCohortVoting(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{t.openAllYears}</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggleCohortVoting(false)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{t.closeAllYears}</span>
              </button>

              {(state?.candidates || []).length > 0 && (
                <div>
                  {isWipingAllCand ? (
                    <div className="flex items-center gap-1.5 bg-rose-950/80 p-1.5 rounded-xl border border-rose-800">
                      <span className="text-xs text-rose-300 font-semibold px-2">{t.confirmDelete}?</span>
                      <button
                        type="button"
                        onClick={handleClearAllCandidates}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        {t.confirmDelete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWipingAllCand(false)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsWipingAllCand(true)}
                      className="px-3 py-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-950 text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.clearAllCandidates}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {(state?.cohorts || []).map((cohort) => {
              const cohortCands = (state?.candidates || []).filter((c) => c.cohortId === cohort.id);
              const isEditingThisCohort = editingCohortId === cohort.id;

              return (
                <div
                  key={cohort.id}
                  className={`rounded-3xl p-5 border transition-all shadow-sm ${
                    isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Cohort Header & Editable Prefix Toolbar */}
                  <div className={`border-b pb-3 mb-3.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    {!isEditingThisCohort ? (
                      <div className="flex items-center justify-between flex-wrap gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className={`font-extrabold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isRtl ? cohort.labelAr : cohort.labelEn}
                          </h4>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold border ${
                              isDark
                                ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <span>{isRtl ? 'بادئة الرقم:' : 'Prefix:'}</span>
                            <span className="text-sm font-black underline decoration-blue-500">{cohort.prefix}</span>
                            <span className="text-[10px] opacity-75">xxxx</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Year Voting Status Badge */}
                          {cohort.open !== false ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{t.yearVotingOpen}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span>{t.yearVotingClosed}</span>
                            </span>
                          )}

                          {/* Year Voting Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleCohortVoting(cohort.id, cohort.open)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                              cohort.open !== false
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300'
                            }`}
                            title={t.toggleYearVoting}
                          >
                            {cohort.open !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>
                              {cohort.open !== false
                                ? (isRtl ? 'إغلاق التصويت' : 'Pause Voting')
                                : (isRtl ? 'فتح التصويت' : 'Open Voting')}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenSingleCohortVoting(cohort.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title={isRtl ? `فتح التصويت لـ ${cohort.labelAr} فقط وإغلاق بقية السنوات` : `Open voting for ${cohort.labelEn} ONLY`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.openOnlyThisYear}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditingCohort(cohort)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title={t.editPrefixBtn}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t.editPrefixBtn}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Inline Cohort & Prefix Edit Form */
                      <div
                        className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-900/90 border-blue-900/60' : 'bg-blue-50/50 border-blue-200'
                        }`}
                      >
                        <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-blue-200/80'}`}>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>
                              {t.editPrefixBtn} ({isRtl ? cohort.labelAr : cohort.labelEn})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={cancelEditingCohort}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {t.prefixLabel}
                            </label>
                            <input
                              type="text"
                              value={editCohortPrefix}
                              onChange={(e) => setEditCohortPrefix(e.target.value)}
                              placeholder="e.g. 224"
                              maxLength={5}
                              className={`w-full px-3 py-2 rounded-xl font-mono text-sm font-bold outline-none border focus:border-blue-500 ${
                                isDark
                                  ? 'bg-slate-950 border-blue-800 text-white'
                                  : 'bg-white border-blue-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {t.yearNameAr}
                            </label>
                            <input
                              type="text"
                              value={editCohortLabelAr}
                              onChange={(e) => setEditCohortLabelAr(e.target.value)}
                              placeholder="السنة الثالثة (دفعة 24/25)"
                              className={`w-full px-3 py-2 rounded-xl text-xs outline-none border focus:border-blue-500 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                              dir="rtl"
                            />
                          </div>

                          <div>
                            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {t.academicYearNum}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={editCohortYear}
                              onChange={(e) => setEditCohortYear(Number(e.target.value))}
                              className={`w-full px-3 py-2 rounded-xl text-xs outline-none border focus:border-blue-500 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {t.yearNameEn}
                          </label>
                          <input
                            type="text"
                            value={editCohortLabelEn}
                            onChange={(e) => setEditCohortLabelEn(e.target.value)}
                            placeholder="Year 3 (Intake 24/25)"
                            className={`w-full px-3 py-2 rounded-xl text-xs outline-none border focus:border-blue-500 ${
                              isDark
                                ? 'bg-slate-950 border-slate-700 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                            dir="ltr"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isSavingCohort}
                            onClick={() => handleSaveCohort(cohort.id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSavingCohort ? 'Saving...' : t.saveChanges}</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingCohort}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                              isDark
                                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.cancelEdit}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Candidates Cards Grid */}
                  {cohortCands.length === 0 ? (
                    <div
                      className={`py-6 px-4 text-center rounded-2xl border border-dashed ${
                        isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                        {isRtl
                          ? 'لا يوجد مرشحون مسجلون لهذه السنة حالياً.'
                          : 'No candidates registered for this academic year yet.'}
                      </p>
                      <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {isRtl
                          ? 'استخدم نموذج "إضافة مرشح جديد" في الأعلى لإضافة مرشحين.'
                          : 'Use the "Add New Candidate" form above to enroll candidates.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {cohortCands.map((cand) => (
                        <div
                          key={cand.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 transition ${
                            isDark
                              ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {isRtl ? cand.nameAr : cand.nameEn}
                            </p>
                            <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {cand.sloganAr || cand.sloganEn || '—'}
                            </p>
                          </div>

                          {/* Clear, Reliable Delete Button */}
                          <button
                            type="button"
                            onClick={() => setCandidateToDelete(cand)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-900/50 shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                            title={t.deleteCandidate}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t.deleteCandidate}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY LOG */}
      {activeTab === 'security' && (
        <div className={`rounded-3xl p-6 border shadow-sm space-y-4 transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>{t.securityIncidentsTitle}</span>
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.securityIncidentsDesc}</p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">{t.thTime}</th>
                  <th className="py-3 px-3.5">{t.thId}</th>
                  <th className="py-3 px-3.5">{t.thName}</th>
                  <th className="py-3 px-3.5">{t.thReason}</th>
                  <th className="py-3 px-3.5">{t.thIp}</th>
                  <th className="py-3 px-3.5">{t.thSeverity}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-normal">
                {(state?.attempts || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                      No security incidents or rejected attempts recorded. All clean.
                    </td>
                  </tr>
                ) : (
                  (state?.attempts || []).map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-white">{att.uniId}</td>
                      <td className="py-2.5 px-3.5 text-slate-200" dir="auto">{att.name}</td>
                      <td className="py-2.5 px-3.5 text-slate-300 font-medium">{att.reason}</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-500 text-[11px]">{att.ip}</td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            att.severity === 'high'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : att.severity === 'medium'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {att.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ROSTER & TOOLS */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          {/* Roster Uploader */}
          <div className={`rounded-3xl p-6 border shadow-sm space-y-4 transition ${isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.rosterManagerTitle}</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.rosterManagerDesc}</p>
            </div>

            <textarea
              rows={4}
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
              placeholder={t.rosterPlaceholder}
              className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none focus:border-blue-500 ${
                isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-300 bg-slate-50 text-slate-900'
              }`}
              dir="ltr"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleImportRoster(false)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {t.importRosterBtn}
              </button>
              <button
                type="button"
                onClick={() => handleImportRoster(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Replace Full Roster
              </button>
            </div>
          </div>

          {/* Reset Ballots */}
          <div className="bg-rose-950/20 rounded-3xl p-6 border border-rose-900/60 space-y-3">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{t.resetElectionTitle}</span>
            </h3>
            <p className="text-xs text-rose-300/80">{t.resetElectionDesc}</p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder={t.resetConfirmPlaceholder}
                className="px-4 py-2.5 rounded-xl border border-rose-800 bg-slate-900 text-xs font-mono text-white outline-none"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleResetElection}
                className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                {t.resetBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Deletion Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${
              isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">{t.deleteCandidate}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isRtl ? 'تأكيد حذف المرشح نهائياً' : 'Confirm Candidate Deletion'}
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border mb-5 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRtl ? candidateToDelete.nameAr : candidateToDelete.nameEn}
              </p>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isRtl
                  ? 'سيتم حذف هذا المرشح من قوائم الانتخاب. لا يمكن حذف مرشح حصل على أصوات إلا بعد تصفير الانتخابات.'
                  : 'This candidate will be removed from the ballot. A candidate who already has votes cannot be deleted until the election is reset.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCandidateToDelete(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t.cancelEdit}
              </button>
              <button
                type="button"
                disabled={isDeletingCandidate}
                onClick={() => handleDeleteCandidate(candidateToDelete.id)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingCandidate ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isRtl ? 'نعم، حذف المرشح' : 'Yes, Delete Candidate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Poster Modal */}
      {qrModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-700 relative">
            <button
              onClick={() => setQrModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>

            <DentistrySeal size="md" className="mx-auto mb-2" />
            <h3 className="font-extrabold text-white text-base">{t.qrPosterTitle}</h3>
            <p className="text-xs text-slate-400 mb-4">{t.qrPosterDesc}</p>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-700 inline-block mb-4 shadow-inner">
              <img src={qrModalData.qrDataUrl} alt="Voting QR Code" className="w-56 h-56 mx-auto" />
            </div>

            <p className="text-xs font-mono text-blue-300 bg-blue-950/70 p-2.5 rounded-xl border border-blue-900 truncate mb-4">
              {qrModalData.url}
            </p>

            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
