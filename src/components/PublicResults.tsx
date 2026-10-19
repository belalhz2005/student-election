import React, { useState, useEffect } from 'react';
import { Trophy, AlertTriangle, ArrowLeft, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { DentistrySeal, SpuLogo } from './SpuBrand.tsx';
import { Language, translations } from '../utils/i18n.ts';
import { CohortResult } from '../utils/election-logic.ts';
import { generateElectionResultsPdf } from '../utils/pdf-export.ts';

interface PublicResultsProps {
  lang: Language;
  onBackToVote: () => void;
}

export const PublicResults: React.FC<PublicResultsProps> = ({ lang, onBackToVote }) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<{
    open: boolean;
    totalVotes: number;
    results: CohortResult[];
  } | null>(null);

  const loadResults = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/public-results');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Results are not available');
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
    const interval = setInterval(loadResults, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExportPdf = () => {
    if (!data) return;
    try {
      const doc = generateElectionResultsPdf({
        results: data.results,
        totalVotes: data.totalVotes,
        isOpen: data.open,
      });
      doc.save('SPU_Faculty_of_Dentistry_Election_Results.pdf');
    } catch (err: any) {
      console.error('PDF generation error:', err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-[#111827] rounded-3xl shadow-xl border border-slate-800 p-6 md:p-8 mb-6 text-center">
        <div className="flex items-center justify-center gap-6 mb-4">
          <SpuLogo size="sm" />
          <div className="h-10 w-px bg-slate-800 hidden sm:block" />
          <DentistrySeal size="sm" />
        </div>

        <h1 className="text-2xl font-extrabold text-white">{t.publicResults}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.councilElection} - {t.facultyName}</p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-xs font-semibold px-3.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800">
            {t.totalVotesCast}: <strong className="font-mono text-sm text-white">{data?.totalVotes || 0}</strong>
          </span>

          {data && (
            <button
              onClick={handleExportPdf}
              className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          )}

          <button
            onClick={loadResults}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="bg-amber-950/40 border border-amber-800 rounded-3xl p-6 text-center text-amber-200 mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="font-bold text-sm">{errorMsg}</p>
          <button
            onClick={onBackToVote}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
          >
            {t.studentPortal}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(data?.results || []).map((cohortRes) => {
            const cohort = cohortRes.cohort;
            const hasWinner = cohortRes.status === 'winner';
            const isTied = cohortRes.status === 'tie';
            const maxVotes = Math.max(1, ...cohortRes.candidates.map((c) => c.votes));

            return (
              <div
                key={cohort.id}
                className="bg-[#111827] rounded-3xl p-5 border border-slate-800 shadow-md"
              >
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="font-extrabold text-white text-base">
                    {isRtl ? cohort.labelAr : cohort.labelEn}
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {cohortRes.totalVotes} {t.votesCount}
                  </span>
                </div>

                {/* Outcome Banner */}
                {hasWinner ? (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold mb-3">
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {t.winnerDeclared}{' '}
                      {isRtl ? cohortRes.winnerNamesAr.join(', ') : cohortRes.winnerNamesEn.join(', ')}
                    </span>
                  </div>
                ) : isTied ? (
                  <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-2xl flex items-center gap-2 text-amber-300 text-xs font-bold mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {t.tiedResult}{' '}
                      {isRtl ? cohortRes.winnerNamesAr.join(' & ') : cohortRes.winnerNamesEn.join(' & ')}
                    </span>
                  </div>
                ) : null}

                {/* Candidates Bars */}
                <div className="space-y-3">
                  {cohortRes.candidates.map((cand) => {
                    const widthPercent = (cand.votes / maxVotes) * 100;
                    return (
                      <div key={cand.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">
                            {cand.isWinner && '🏆 '}
                            {isRtl ? cand.nameAr : cand.nameEn}
                          </span>
                          <span className="font-mono text-slate-400">
                            {cand.votes} ({cand.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              cand.isWinner ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-blue-600'
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
      )}

      <div className="text-center">
        <button
          onClick={onBackToVote}
          className="px-6 py-2.5 rounded-2xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t.studentPortal}</span>
        </button>
      </div>
    </div>
  );
};
