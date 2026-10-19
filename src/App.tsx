import React, { useState, useEffect, useRef } from 'react';
import { Languages, Vote, BarChart3, ShieldCheck, Sun, Moon, Lock } from 'lucide-react';
import { VoterPortal } from './components/VoterPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { PublicResults } from './components/PublicResults.tsx';
import { DentistrySeal, SpuLogo } from './components/SpuBrand.tsx';
import { Language, translations } from './utils/i18n.ts';

export type Theme = 'light' | 'dark';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('spu_dent_lang');
    if (saved === 'ar' || saved === 'en') return saved;
    return 'ar'; // Default to Arabic for SPU Faculty of Dentistry
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('spu_dent_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // Restored Light theme as requested by user
  });

  const [view, setView] = useState<'voter' | 'admin' | 'public-results'>('voter');
  const [publicResultsEnabled, setPublicResultsEnabled] = useState<boolean>(false);

  // Discreet Admin Trigger (Triple-click counter on university seal)
  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<any>(null);

  const handleDiscreetAdminTrigger = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setView('admin');
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 1500);
    }
  };

  // Keyboard shortcut: Ctrl+Shift+A or Alt+A to open admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        setView((prev) => (prev === 'admin' ? 'voter' : 'admin'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check URL parameter: ?admin=1 or #admin
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('admin') || window.location.hash === '#admin') {
      setView('admin');
    }
  }, []);

  // Sync HTML dir and lang
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('spu_dent_lang', lang);
  }, [lang]);

  // Sync Theme attribute
  useEffect(() => {
    localStorage.setItem('spu_dent_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Check public results availability
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.publicResults === 'boolean') {
          setPublicResultsEnabled(data.publicResults);
        }
      })
      .catch(() => {});
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = translations[lang];

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-blue-600 selection:text-white ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50/90 text-slate-900'
      }`}
    >
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${
          isDark
            ? 'bg-[#0f172a]/90 border-slate-800 shadow-lg'
            : 'bg-white/90 border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & Faculty Brand with Discreet 3-Click Admin Trigger */}
          <div
            onClick={handleDiscreetAdminTrigger}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title={lang === 'ar' ? 'كلية طب الأسنان - الجامعة السورية الخاصة' : 'SPU Faculty of Dentistry'}
          >
            <DentistrySeal size="sm" />
            <div className="hidden sm:block">
              <span
                className={`font-extrabold text-xs sm:text-sm block leading-tight transition ${
                  isDark ? 'text-slate-100 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-700'
                }`}
              >
                {t.facultyName}
              </span>
              <span className={`text-[10px] block leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.universityName}
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* If in Admin view or Public Results, provide return button */}
            {view !== 'voter' && (
              <button
                onClick={() => setView('voter')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                  isDark
                    ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-300/80'
                }`}
              >
                <Vote className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.studentPortal}</span>
              </button>
            )}

            {publicResultsEnabled && view !== 'public-results' && (
              <button
                onClick={() => setView('public-results')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300/80'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.publicResults}</span>
              </button>
            )}

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                isDark
                  ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-300/80'
              }`}
              title={isDark ? 'Switch to Light Theme / المظهر الفاتح' : 'Switch to Dark Theme / المظهر الداكن'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'فاتح' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'ar' ? 'داكن' : 'Dark'}</span>
                </>
              )}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                isDark
                  ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-300/80'
              }`}
              title="Toggle language / تغيير اللغة"
            >
              <Languages className="w-3.5 h-3.5 text-blue-500" />
              <span>{t.langToggle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'voter' && (
          <VoterPortal
            lang={lang}
            theme={theme}
            onPublicResultsClick={() => setView('public-results')}
            publicResultsEnabled={publicResultsEnabled}
          />
        )}

        {view === 'admin' && (
          <AdminPortal
            lang={lang}
            theme={theme}
            onBackToVoter={() => setView('voter')}
          />
        )}

        {view === 'public-results' && (
          <PublicResults
            lang={lang}
            theme={theme}
            onBackToVote={() => setView('voter')}
          />
        )}
      </main>

      {/* Subtle Footer with Discreet Admin Entry */}
      <footer
        className={`py-6 border-t text-center text-xs transition-colors ${
          isDark
            ? 'border-slate-800/80 bg-[#0f172a]/50 text-slate-500'
            : 'border-slate-200 bg-white/70 text-slate-500'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DentistrySeal size="sm" className="opacity-90" />
            <p>
              © {new Date().getFullYear()} {t.universityName} • {t.facultyName}
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>{isDark ? 'المظهر الداكن مفعّل' : 'المظهر الفاتح مفعّل'}</span>
            <button
              onClick={() => setView('admin')}
              className={`p-1.5 rounded-lg transition opacity-40 hover:opacity-100 cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
              }`}
              title="Committee access"
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
