// Shared by both pages. Elements use data-i18n / data-i18n-ph; dynamic text uses t().
const D = {
  en: {
    lang_btn: 'العربية',
    title_vote: 'Student Council Election', title_admin: 'Election Admin',
    h_vote: 'Student Council Election',
    sub: 'Vote for a candidate from your own academic year. One vote per student.',
    closed: 'Voting is currently closed.',
    h_details: '1. Your details', l_name: 'Full name', l_uid: 'University ID',
    btn_continue: 'Continue', h_choose: '2. Choose your candidate', btn_submit: 'Submit my vote', btn_back: 'Back',
    note_final: 'Your vote cannot be changed after you submit it.',
    h_thanks: 'Thank you!', m_recorded: 'Your vote has been recorded.',
    h_admin: 'Election Admin', l_pw: 'Password', btn_login: 'Log in', btn_logout: 'Log out',
    st_open: 'VOTING OPEN', st_closed: 'VOTING CLOSED', btn_open: 'Open voting', btn_close: 'Close voting',
    tab_results: 'Results', tab_voters: 'Voters', tab_setup: 'Years & candidates', tab_tools: 'Roster, QR & export',
    ph_search: 'Search name or ID', all_years: 'All years',
    th_time: 'Time', th_id: 'ID', th_name: 'Name', th_year: 'Year', th_reason: 'Reason',
    h_attempts: 'Rejected attempts', d_attempts: 'Wrong year, not on roster, double votes. Newest first.',
    h_years: 'Academic years',
    d_years: 'A student belongs to the year whose ID prefix their ID starts with (e.g. prefix 224 → ID 2240207).',
    ph_prefix: 'ID prefix, e.g. 224', ph_label: 'Name, e.g. Year 3', btn_addupd: 'Add / update',
    h_roster: 'Voter roster (optional but recommended)',
    d_roster: 'One student per line: ID, Full name. When a roster exists, only listed IDs can vote and names that differ are flagged. Importing replaces the old roster.',
    btn_import: 'Import roster', btn_clear: 'Clear roster',
    h_qr: 'QR code for students', d_qr: 'Shown when the server was started with start.sh (Cloudflare tunnel). Display it on a screen or print it.',
    h_export: 'Export', ex_results: 'Results (CSV)', ex_voters: 'Voters (CSV)',
    h_reset: 'Reset election', d_reset: 'Deletes all votes and rejected attempts and closes voting. Candidates and years are kept.',
    ph_reset: 'Type RESET', btn_reset: 'Reset',
    ph_cand: 'New candidate full name', btn_addcand: 'Add candidate', btn_remove: 'Remove', btn_delyear: 'Delete year',
    no_cands: 'No candidates yet.',
    total: (n) => `${n} votes cast in total.`,
    prefix_line: (p, x) => `ID prefix ${p} · ${x}`,
    turnout: (v, e, pct) => `${v} of ${e} eligible (${pct}%)`, votes_n: (n) => `${n} votes`,
    leading: 'Leading: ', winner: 'WINNER: ', tie: 'TIE: ',
    cand_votes: (name, n) => `${name} (${n} votes)`,
    voters_shown: (n, tot) => `${n} voters shown (${tot} total). Names differing from the roster are marked ⚠.`,
    roster_active: (n) => `Roster active: ${n} students.`, roster_none: 'No roster: any ID with a valid year prefix can vote.',
    imported: (n, s) => `Imported ${n} students` + (s ? `, skipped ${s} invalid lines.` : '.'),
    reset_done: 'Election reset.',
    title_report: 'Election Results Report', r_title: 'Election Results Report',
    r_generated: (d) => `Generated: ${d}`, r_none: 'No votes cast',
    th_rank: '#', th_cand: 'Candidate', th_votes: 'Votes', th_pct: '%',
    btn_print: 'Save as PDF / Print', chk_voters: 'Include list of voters', r_hint: 'Tip: choose "Save as PDF" as the printer in the print window.',
    r_sign: 'Election committee signature', r_date: 'Date',
    need_login: 'Please log in at /admin first, then open this page again.',
    ex_pdf: 'Printable report / PDF', ex_txt: 'Results (.txt)',
    th_action: 'Action', btn_cancelvote: 'Cancel vote', only_flagged: 'Only flagged votes',
    same_phone: (n) => `same phone ×${n}`,
    confirm_cancel: (name, id) => `Cancel the vote of ${name} (${id})? They will be able to vote again. This is logged.`,
    d_flags: '⚠ typed name differs from the roster · 📱 the same phone sent several votes under different IDs. Flags are hints to review, nothing is blocked.',
  },
  ar: {
    lang_btn: 'English',
    title_vote: 'انتخابات مجلس الطلبة', title_admin: 'إدارة الانتخابات',
    h_vote: 'انتخابات مجلس الطلبة',
    sub: 'صوّت لمرشح من سنتك الدراسية. لكل طالب صوت واحد فقط.',
    closed: 'التصويت مغلق حاليًا.',
    h_details: '١. بياناتك', l_name: 'الاسم الكامل', l_uid: 'الرقم الجامعي',
    btn_continue: 'متابعة', h_choose: '٢. اختر مرشحك', btn_submit: 'تأكيد التصويت', btn_back: 'رجوع',
    note_final: 'لا يمكن تغيير صوتك بعد إرساله.',
    h_thanks: 'شكرًا لك!', m_recorded: 'تم تسجيل صوتك.',
    h_admin: 'إدارة الانتخابات', l_pw: 'كلمة المرور', btn_login: 'تسجيل الدخول', btn_logout: 'تسجيل الخروج',
    st_open: 'التصويت مفتوح', st_closed: 'التصويت مغلق', btn_open: 'فتح التصويت', btn_close: 'إغلاق التصويت',
    tab_results: 'النتائج', tab_voters: 'المصوّتون', tab_setup: 'السنوات والمرشحون', tab_tools: 'القوائم والرمز والتصدير',
    ph_search: 'ابحث بالاسم أو الرقم', all_years: 'كل السنوات',
    th_time: 'الوقت', th_id: 'الرقم', th_name: 'الاسم', th_year: 'السنة', th_reason: 'السبب',
    h_attempts: 'المحاولات المرفوضة', d_attempts: 'سنة خاطئة، غير مدرج في القائمة، تصويت مكرر. الأحدث أولًا.',
    h_years: 'السنوات الدراسية',
    d_years: 'ينتمي الطالب إلى السنة التي تبدأ بها بادئة رقمه الجامعي (مثلًا البادئة 224 ← الرقم 2240207).',
    ph_prefix: 'بادئة الرقم، مثل 224', ph_label: 'الاسم، مثل السنة الثالثة', btn_addupd: 'إضافة / تعديل',
    h_roster: 'قائمة الناخبين (اختيارية لكن موصى بها)',
    d_roster: 'طالب واحد في كل سطر: الرقم، الاسم الكامل. عند وجود قائمة يصوّت المدرجون فقط ويتم تنبيهك إلى الأسماء المختلفة. الاستيراد يستبدل القائمة القديمة.',
    btn_import: 'استيراد القائمة', btn_clear: 'مسح القائمة',
    h_qr: 'رمز QR للطلاب', d_qr: 'يظهر عند تشغيل الخادم عبر start.sh (نفق Cloudflare). اعرضه على شاشة أو اطبعه.',
    h_export: 'تصدير', ex_results: 'النتائج (CSV)', ex_voters: 'المصوّتون (CSV)',
    h_reset: 'إعادة ضبط الانتخابات', d_reset: 'يحذف كل الأصوات والمحاولات المرفوضة ويغلق التصويت. يبقى المرشحون والسنوات.',
    ph_reset: 'اكتب RESET', btn_reset: 'إعادة الضبط',
    ph_cand: 'الاسم الكامل للمرشح الجديد', btn_addcand: 'إضافة مرشح', btn_remove: 'حذف', btn_delyear: 'حذف السنة',
    no_cands: 'لا يوجد مرشحون بعد.',
    total: (n) => `إجمالي الأصوات: ${n}`,
    prefix_line: (p, x) => `بادئة الرقم ${p} · ${x}`,
    turnout: (v, e, pct) => `${v} من ${e} مؤهل (${pct}%)`, votes_n: (n) => `${n} صوت`,
    leading: 'المتقدم: ', winner: 'الفائز: ', tie: 'تعادل: ',
    cand_votes: (name, n) => `${name} (${n} صوت)`,
    voters_shown: (n, tot) => `المعروض ${n} من ${tot} مصوّت. الأسماء المختلفة عن القائمة معلّمة بـ ⚠.`,
    roster_active: (n) => `القائمة مفعّلة: ${n} طالب.`, roster_none: 'لا توجد قائمة: يمكن لأي رقم ببادئة سنة صحيحة أن يصوّت.',
    imported: (n, s) => `تم استيراد ${n} طالب` + (s ? `، وتخطي ${s} سطر غير صالح.` : '.'),
    reset_done: 'تمت إعادة ضبط الانتخابات.',
    title_report: 'تقرير نتائج الانتخابات', r_title: 'تقرير نتائج الانتخابات',
    r_generated: (d) => `تاريخ التقرير: ${d}`, r_none: 'لم تُسجَّل أصوات',
    th_rank: '#', th_cand: 'المرشح', th_votes: 'الأصوات', th_pct: '%',
    btn_print: 'حفظ بصيغة PDF / طباعة', chk_voters: 'تضمين قائمة المصوّتين', r_hint: 'نصيحة: اختر «حفظ بصيغة PDF» كطابعة في نافذة الطباعة.',
    r_sign: 'توقيع لجنة الانتخابات', r_date: 'التاريخ',
    need_login: 'يرجى تسجيل الدخول من /admin أولًا ثم فتح هذه الصفحة مرة أخرى.',
    ex_pdf: 'تقرير للطباعة / PDF', ex_txt: 'النتائج (.txt)',
    th_action: 'إجراء', btn_cancelvote: 'إلغاء الصوت', only_flagged: 'الأصوات المُعلَّمة فقط',
    same_phone: (n) => `نفس الهاتف ×${n}`,
    confirm_cancel: (name, id) => `إلغاء صوت ${name} (${id})؟ سيتمكن من التصويت مرة أخرى. يتم تسجيل هذا الإجراء.`,
    d_flags: '⚠ الاسم المكتوب يختلف عن القائمة · 📱 أُرسلت عدة أصوات من الهاتف نفسه بأرقام جامعية مختلفة. العلامات للمراجعة فقط ولا يتم حظر أي شيء.',
  },
};

// Server messages are English; translate by exact text.
const AR_MSG = {
  'Voting is currently closed.': 'التصويت مغلق حاليًا.',
  'Please enter your full name (first name and family name at least).': 'يرجى إدخال اسمك الكامل (الاسم الأول واسم العائلة على الأقل).',
  'This ID does not belong to an academic year taking part in this election.': 'هذا الرقم الجامعي لا ينتمي إلى سنة دراسية مشاركة في هذه الانتخابات.',
  'This ID is not on the list of eligible students. Contact the election committee.': 'هذا الرقم غير مدرج في قائمة الطلاب المؤهلين. تواصل مع لجنة الانتخابات.',
  'This ID has already voted.': 'تم التصويت بهذا الرقم الجامعي من قبل.',
  'There are no candidates for your academic year yet.': 'لا يوجد مرشحون لسنتك الدراسية بعد.',
  'Please choose a candidate.': 'يرجى اختيار مرشح.',
  'You can only vote for candidates of your own academic year.': 'يمكنك التصويت لمرشحي سنتك الدراسية فقط.',
  'Too many requests. Please wait a minute.': 'طلبات كثيرة. يرجى الانتظار دقيقة.',
  'Something went wrong. Try again.': 'حدث خطأ. حاول مرة أخرى.',
  'Could not save your vote. Please try again.': 'تعذّر حفظ صوتك. يرجى المحاولة مرة أخرى.',
  'Something went wrong.': 'حدث خطأ.', 'Invalid request.': 'طلب غير صالح.',
  'Wrong password.': 'كلمة المرور خاطئة.', 'Too many attempts. Wait a minute.': 'محاولات كثيرة. انتظر دقيقة.',
  'Not logged in.': 'لم تسجّل الدخول.',
  'Prefix must be 1-6 digits (the start of the student ID).': 'يجب أن تكون البادئة من 1 إلى 6 أرقام (بداية الرقم الجامعي).',
  'Give the year a name.': 'أدخل اسمًا للسنة.',
  "Delete this year's candidates first.": 'احذف مرشحي هذه السنة أولًا.',
  'This year already has votes.': 'هذه السنة فيها أصوات بالفعل.',
  'Candidate name is too short.': 'اسم المرشح قصير جدًا.', 'Unknown year.': 'سنة غير معروفة.',
  'This candidate already has votes. Reset the election to remove them.': 'لهذا المرشح أصوات بالفعل. أعد ضبط الانتخابات لحذفه.',
  'Type RESET to confirm.': 'اكتب RESET للتأكيد.',
  'No vote found for this ID.': 'لا يوجد صوت لهذا الرقم الجامعي.',
  'Vote cancelled by admin': 'ألغى المشرف هذا الصوت',
  // reasons stored in the rejected-attempts log
  'ID does not belong to any academic year in this election': 'الرقم لا ينتمي إلى أي سنة دراسية في هذه الانتخابات',
  'ID not on the voter roster': 'الرقم غير مدرج في قائمة الناخبين',
  'Tried to vote twice': 'حاول التصويت مرتين',
  'Tried to vote for a candidate outside their academic year': 'حاول التصويت لمرشح من خارج سنته الدراسية',
};

let lang = 'en';
try { lang = localStorage.getItem('lang') || ((navigator.language || '').startsWith('ar') ? 'ar' : 'en'); } catch { /* storage blocked */ }

const t = (k, ...a) => { const v = D[lang][k] ?? D.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const errMsg = (m) => {
  if (lang !== 'ar') return m;
  const d = /^University ID must be exactly (\d+) digits\.$/.exec(m);
  return d ? `يجب أن يتكون الرقم الجامعي من ${d[1]} أرقام.` : AR_MSG[m] || m;
};
const when = (ts) => new Date(ts).toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB');

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t(document.body.dataset.title);
  for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of document.querySelectorAll('[data-i18n-ph]')) e.placeholder = t(e.dataset.i18nPh);
  if (window.onLang) window.onLang();
}
for (const b of document.querySelectorAll('.langbtn')) b.onclick = () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('lang', lang); } catch { /* storage blocked */ }
  applyLang();
};
