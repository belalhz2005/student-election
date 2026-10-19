export type Language = 'ar' | 'en';

export interface Translations {
  universityName: string;
  facultyName: string;
  councilElection: string;
  systemSubtitle: string;
  votingOpen: string;
  votingClosed: string;
  studentPortal: string;
  adminPortal: string;
  publicResults: string;
  langToggle: string;
  // Step 1: Identification
  step1Title: string;
  step1Desc: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  fullNameHint: string;
  uniIdLabel: string;
  uniIdPlaceholder: string;
  uniIdHint: string;
  detectedYear: string;
  unrecognizedPrefix: string;
  continueBtn: string;
  // Step 2: Ballot
  step2Title: string;
  step2Desc: string;
  academicYearLabel: string;
  selectCandidate: string;
  backBtn: string;
  confirmBtn: string;
  oneVoteNotice: string;
  noCandidates: string;
  // Step 3: Confirmation
  confirmModalTitle: string;
  confirmModalWarning: string;
  voterSummary: string;
  candidateSummary: string;
  submitVoteBtn: string;
  cancelBtn: string;
  submitting: string;
  // Step 4: Receipt
  receiptTitle: string;
  receiptSubtitle: string;
  receiptCodeLabel: string;
  timestampLabel: string;
  printReceiptBtn: string;
  doneBtn: string;
  // Admin Login
  adminLoginTitle: string;
  passwordLabel: string;
  loginBtn: string;
  logoutBtn: string;
  // Admin Dashboard
  dashboardTitle: string;
  tabResults: string;
  tabVoters: string;
  tabSetup: string;
  tabSecurity: string;
  tabTools: string;
  totalVotesCast: string;
  registeredRoster: string;
  turnoutRate: string;
  participatingYears: string;
  openVotingBtn: string;
  closeVotingBtn: string;
  winnerDeclared: string;
  tiedResult: string;
  noVotesYet: string;
  turnoutOf: string;
  votesCount: string;
  searchPlaceholder: string;
  filterAllYears: string;
  thTime: string;
  thId: string;
  thName: string;
  thYear: string;
  thReceipt: string;
  thStatus: string;
  verifiedMatch: string;
  nameMismatchFlag: string;
  cancelVoteBtn: string;
  confirmCancelVote: string;
  sameDeviceFlag: string;
  exportCsvBtn: string;
  exportVotersBtn: string;
  exportPdfBtn: string;
  addCandidateBtn: string;
  candidateNameAr: string;
  candidateNameEn: string;
  sloganAr: string;
  sloganEn: string;
  manageYears: string;
  prefixLabel: string;
  yearNameAr: string;
  yearNameEn: string;
  editPrefixBtn: string;
  saveChanges: string;
  confirmDelete: string;
  deleteCandidate: string;
  clearAllCandidates: string;
  cancelEdit: string;
  academicYearNum: string;
  toggleYearVoting: string;
  yearVotingOpen: string;
  yearVotingClosed: string;
  yearVotingPausedMsg: string;
  openAllYears: string;
  closeAllYears: string;
  openSingleYearOnly: string;
  openYear2Only: string;
  yearControlPanelTitle: string;
  yearControlPanelSubtitle: string;
  openOnlyThisYear: string;
  securityIncidentsTitle: string;
  securityIncidentsDesc: string;
  thReason: string;
  thIp: string;
  thSeverity: string;
  rosterManagerTitle: string;
  rosterManagerDesc: string;
  rosterPlaceholder: string;
  importRosterBtn: string;
  clearRosterBtn: string;
  qrPosterTitle: string;
  qrPosterDesc: string;
  generateQrBtn: string;
  resetElectionTitle: string;
  resetElectionDesc: string;
  resetConfirmPlaceholder: string;
  resetBtn: string;
  votingClosedNotice: string;
  votingClosedHelp: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    universityName: 'الجامعة السورية الخاصة',
    facultyName: 'كلية طب الأسنان',
    councilElection: 'انتخابات الهيئة الطلابية ومجلس الكلية',
    systemSubtitle: 'نظام الاقتراع الإلكتروني والفرز الآلي الرسمي لطلاب كلية طب الأسنان',
    votingOpen: 'التصويت متاح الآن',
    votingClosed: 'التصويت مغلق حاليًا',
    studentPortal: 'بوابة التصويت',
    adminPortal: 'لوحة التحكم الانتخابية',
    publicResults: 'النتائج المباشرة',
    langToggle: 'English',
    // Step 1
    step1Title: '١. التحقق من الهوية الجامعية والسنة الدراسية',
    step1Desc: 'يرجى إدخال اسمك الكامل ورقمك الجامعي للتحقق الآلي من سنتك الدراسية وحق الاقتراع.',
    fullNameLabel: 'الاسم الكامل الثلاثي',
    fullNamePlaceholder: '',
    fullNameHint: '',
    uniIdLabel: 'الرقم الجامعي (٧ أرقام)',
    uniIdPlaceholder: '',
    uniIdHint: '',
    detectedYear: 'السنة الدراسية المحددة آليًا:',
    unrecognizedPrefix: 'الرقم لا ينتمي لأي سنة دراسية مشاركة (من السنة الأولى إلى الخامسة)',
    continueBtn: 'متابعة لاختيار المرشح',
    // Step 2
    step2Title: '٢. اختيار مرشح مجلس الكلية',
    step2Desc: 'اختر المرشح الذي يمثلك في سنتك الدراسية. يحق لك صوت واحد فقط ولا يمكن التعديل بعد التأكيد.',
    academicYearLabel: 'السنة الدراسية المعتمدة لك:',
    selectCandidate: 'اختر مرشحًا واحدًا:',
    backBtn: 'الرجوع للبيانات',
    confirmBtn: 'مراجعة وتأكيد الصوت',
    oneVoteNotice: 'تنبيه أمان: لكل طالب صوت واحد فقط مخصص لمرشحي سنته الدراسية.',
    noCandidates: 'لا يوجد مرشحون مسجلون لهذه السنة الدراسية حتى الآن.',
    // Step 3
    confirmModalTitle: 'تأكيد إرسال ورقة الاقتراع',
    confirmModalWarning: 'هل أنت متأكد من رغبتك في إرسال هذا الصوت؟ بعد الضغط على تأكيد لا يمكن سحب الصوت أو تغييره.',
    voterSummary: 'بيانات الناخب:',
    candidateSummary: 'المرشح المختار:',
    submitVoteBtn: 'تأكيد الاقتراع النهائي',
    cancelBtn: 'تعديل الاختيار',
    submitting: 'جارٍ تسجيل الصوت وتوليد الرمز المشفر...',
    // Step 4
    receiptTitle: 'تم تسجيل صوتك بنجاح!',
    receiptSubtitle: 'شكرًا لمشاركتك الفاعلة في انتخابات مجلس كلية طب الأسنان.',
    receiptCodeLabel: 'رمز إيصال الاقتراع الرقمي المشفر:',
    timestampLabel: 'توقيت التسجيل:',
    printReceiptBtn: 'طباعة / حفظ الإيصال كإثبات',
    doneBtn: 'العودة للرئيسية',
    // Admin Login
    adminLoginTitle: 'دخول لجنة الانتخابات المركزية',
    passwordLabel: 'كلمة مرور المشرف',
    loginBtn: 'تسجيل الدخول',
    logoutBtn: 'تسجيل الخروج',
    // Dashboard
    dashboardTitle: 'لوحة إدارة ومراقبة الانتخابات',
    tabResults: 'النتائج والفائزون',
    tabVoters: 'سجل المقترعين',
    tabSetup: 'السنوات والمرشحون',
    tabSecurity: 'سجل الحماية والأخطاء',
    tabTools: 'القوائم والأدوات',
    totalVotesCast: 'إجمالي الأصوات المودعة',
    registeredRoster: 'الطلاب المسجلون بالقائمة',
    turnoutRate: 'نسبة الإقبال الإجمالية',
    participatingYears: 'السنوات الدراسية المشاركة',
    openVotingBtn: 'فتح باب الاقتراع',
    closeVotingBtn: 'إغلاق باب الاقتراع',
    winnerDeclared: '🏆 فائز رسمي بالسنة الدراسية:',
    tiedResult: '⚠️ تعادل في الأصوات بين:',
    noVotesYet: 'لا توجد أصوات بعد في هذه السنة',
    turnoutOf: 'من أصل',
    votesCount: 'صوت',
    searchPlaceholder: 'ابحث بالاسم، الرقم الجامعي، أو رمز الإيصال...',
    filterAllYears: 'كل السنوات الدراسية',
    thTime: 'الوقت',
    thId: 'الرقم الجامعي',
    thName: 'الاسم',
    thYear: 'السنة الدراسية',
    thReceipt: 'رمز الإيصال',
    thStatus: 'الحالة والمطابقة',
    verifiedMatch: 'مطابق للقائمة',
    nameMismatchFlag: 'تنبيه: اختلاف في الاسم',
    cancelVoteBtn: 'إلغاء الصوت',
    confirmCancelVote: 'إلغاء صوت هذا الطالب؟ سيتمكن من التصويت مرة أخرى.',
    sameDeviceFlag: 'أصوات من نفس الهاتف',
    exportCsvBtn: 'تصدير النتائج الرسمية (CSV)',
    exportPdfBtn: 'تحميل تقرير النتائج الرسمي (PDF)',
    exportVotersBtn: 'تصدير سجل المقترعين (CSV)',
    addCandidateBtn: 'إضافة مرشح جديد',
    candidateNameAr: 'اسم المرشح (بالعربية)',
    candidateNameEn: 'اسم المرشح (بالإنكليزية)',
    sloganAr: 'البرنامج الانتخابي / الشعار',
    sloganEn: 'الشعار بالإنكليزية',
    manageYears: 'إدارة بادئات السنوات الدراسية',
    prefixLabel: 'بادئة الرقم (مثال: 224 للسنة 3)',
    yearNameAr: 'اسم السنة بالعربية',
    yearNameEn: 'اسم السنة بالإنكليزية',
    editPrefixBtn: 'تعديل البادئة والبيانات',
    saveChanges: 'حفظ التعديلات',
    confirmDelete: 'تأكيد الحذف',
    deleteCandidate: 'حذف المرشح',
    clearAllCandidates: 'مسح كافة المرشحين',
    cancelEdit: 'إلغاء',
    academicYearNum: 'رقم السنة الدراسية (1-5)',
    toggleYearVoting: 'التحكم بالتصويت لهذه السنة',
    yearVotingOpen: 'التصويت مفتوح لهذه السنة',
    yearVotingClosed: 'التصويت مغلق لهذه السنة',
    yearVotingPausedMsg: 'التصويت مغلق حالياً لهذه السنة الدراسية بناءً على تعليمات اللجنة الانتخابية.',
    openAllYears: 'فتح التصويت لجميع السنوات',
    closeAllYears: 'إغلاق التصويت لجميع السنوات',
    openSingleYearOnly: 'فتح التصويت لهذه السنة فقط',
    openYear2Only: 'فتح السنة الثانية فقط',
    yearControlPanelTitle: 'لوحة التحكم بالتصويت حسب الدفعات',
    yearControlPanelSubtitle: 'تمكنك هذه اللوحة من التحكم الدقيق بفتح أو إغلاق التصويت لسنوات دراسية محددة (مثل فتح السنة الثانية فقط وإغلاق باقي السنوات).',
    openOnlyThisYear: 'فتح هذه السنة فقط',
    securityIncidentsTitle: 'سجل مراقبة النزاهة والمحاولات المرفوضة',
    securityIncidentsDesc: 'رصد فوري لمحاولات الاقتراع المكرر، الأرقام غير المعرفة، واختلافات بيانات الطلاب.',
    thReason: 'سبب الرفض / التنبيه',
    thIp: 'عنوان الاتصال (IP)',
    thSeverity: 'مستوى الخطورة',
    rosterManagerTitle: 'استيراد قائمة الطلاب الرسمية (Roster)',
    rosterManagerDesc: 'ألصق أرقام وأسماء الطلاب (سطر لكل طالب: الرقم الجامعي، الاسم الكامل) لمنع أي تصويت من خارج الكلية.',
    rosterPlaceholder: '2240207, أحمد علي حسن\n2240208, سارة محمد الشامي\n2230101, عمر خالد الحلبي',
    importRosterBtn: 'استيراد القائمة وتحديث قاعدة البيانات',
    clearRosterBtn: 'مسح القائمة',
    qrPosterTitle: 'رمز QR الرسمي للاقتراع عبر الجوال',
    qrPosterDesc: 'اعرض هذا الرمز أو اطبعه كملصق في ردهات ومدرجات كلية طب الأسنان لتمكين الطلاب من التصويت السريع.',
    generateQrBtn: 'عرض بوستر QR للطباعة',
    resetElectionTitle: 'إعادة ضبط الانتخابات وتصفير الأصوات',
    resetElectionDesc: 'مسح كافة الأصوات المودعة وسجلات الاقتراع مع الاحتفاظ ببيانات المرشحين والسنوات.',
    resetConfirmPlaceholder: 'اكتب RESET_ELECTION للتأكيد',
    resetBtn: 'تأكيد تصفير الانتخابات',
    votingClosedNotice: 'باب الاقتراع مغلق حاليًا بأمر من اللجنة العليا المشرفة على الانتخابات.',
    votingClosedHelp: 'يرجى مراجعة عمادة كلية طب الأسنان أو لجنة الانتخابات لمعرفة مواعيد فتح الصناديق.',
  },
  en: {
    universityName: 'Syrian Private University',
    facultyName: 'Faculty of Dentistry',
    councilElection: 'Student Council & Faculty Board Elections',
    systemSubtitle: 'Official electronic voting and automated tallying platform for dentistry students',
    votingOpen: 'Voting is LIVE',
    votingClosed: 'Voting is CLOSED',
    studentPortal: 'Voter Portal',
    adminPortal: 'Election Control Board',
    publicResults: 'Live Results',
    langToggle: 'العربية',
    // Step 1
    step1Title: '1. Identity & Academic Year Verification',
    step1Desc: 'Enter your full name and 7-digit University ID for automatic year matching and eligibility verification.',
    fullNameLabel: 'Full Student Name',
    fullNamePlaceholder: '',
    fullNameHint: '',
    uniIdLabel: 'University ID Number (7 digits)',
    uniIdPlaceholder: '',
    uniIdHint: '',
    detectedYear: 'Automatically Detected Academic Year:',
    unrecognizedPrefix: 'ID does not belong to any participating academic year (Year 1 to 5)',
    continueBtn: 'Proceed to Candidate Ballot',
    // Step 2
    step2Title: '2. Select Your Council Candidate',
    step2Desc: 'Cast your vote for the candidate representing your academic year. One vote per student only.',
    academicYearLabel: 'Your verified academic year:',
    selectCandidate: 'Select one candidate:',
    backBtn: 'Back to Details',
    confirmBtn: 'Review & Confirm Vote',
    oneVoteNotice: 'Security Notice: Each student has exactly one vote, restricted to candidates of their academic year.',
    noCandidates: 'No registered candidates found for your academic year yet.',
    // Step 3
    confirmModalTitle: 'Confirm Ballot Submission',
    confirmModalWarning: 'Are you sure you want to cast this vote? Once submitted, your vote is recorded and cannot be changed.',
    voterSummary: 'Voter Details:',
    candidateSummary: 'Selected Candidate:',
    submitVoteBtn: 'Submit Final Vote',
    cancelBtn: 'Change Selection',
    submitting: 'Securing vote and generating cryptographic receipt...',
    // Step 4
    receiptTitle: 'Your Vote Has Been Recorded!',
    receiptSubtitle: 'Thank you for participating in the Faculty of Dentistry Student Council elections.',
    receiptCodeLabel: 'Official Cryptographic Vote Receipt Code:',
    timestampLabel: 'Timestamp:',
    printReceiptBtn: 'Print / Save Official Receipt',
    doneBtn: 'Return to Home',
    // Admin Login
    adminLoginTitle: 'Central Election Committee Login',
    passwordLabel: 'Admin Security Password',
    loginBtn: 'Log In',
    logoutBtn: 'Log Out',
    // Dashboard
    dashboardTitle: 'Election Administration & Oversight',
    tabResults: 'Results & Winners',
    tabVoters: 'Voters Registry',
    tabSetup: 'Years & Candidates',
    tabSecurity: 'Security & Integrity Log',
    tabTools: 'Roster & Tools',
    totalVotesCast: 'Total Ballots Cast',
    registeredRoster: 'Registered on Roster',
    turnoutRate: 'Overall Turnout Rate',
    participatingYears: 'Participating Academic Years',
    openVotingBtn: 'Open Voting',
    closeVotingBtn: 'Close Voting',
    winnerDeclared: '🏆 DECLARED WINNER:',
    tiedResult: '⚠️ TIED LEADERS:',
    noVotesYet: 'No votes cast in this year yet',
    turnoutOf: 'out of',
    votesCount: 'votes',
    searchPlaceholder: 'Search by student name, ID, or receipt code...',
    filterAllYears: 'All Academic Years',
    thTime: 'Time',
    thId: 'University ID',
    thName: 'Student Name',
    thYear: 'Academic Year',
    thReceipt: 'Receipt Code',
    thStatus: 'Roster Status',
    verifiedMatch: 'Verified Match',
    nameMismatchFlag: 'Name Mismatch Warning',
    cancelVoteBtn: 'Cancel vote',
    confirmCancelVote: "Cancel this student's vote? They will be able to vote again.",
    sameDeviceFlag: 'votes from the same phone',
    exportCsvBtn: 'Export Official Results (CSV)',
    exportVotersBtn: 'Export Voters Roll (CSV)',
    exportPdfBtn: 'Export Official Results (PDF)',
    addCandidateBtn: 'Add New Candidate',
    candidateNameAr: 'Candidate Name (Arabic)',
    candidateNameEn: 'Candidate Name (English)',
    sloganAr: 'Campaign Slogan (Arabic)',
    sloganEn: 'Campaign Slogan (English)',
    manageYears: 'Academic Year Cohort Prefixes',
    prefixLabel: 'ID Prefix (e.g. 224 for Year 3)',
    yearNameAr: 'Year Label (Arabic)',
    yearNameEn: 'Year Label (English)',
    editPrefixBtn: 'Edit Prefix & Details',
    saveChanges: 'Save Changes',
    confirmDelete: 'Confirm Delete',
    deleteCandidate: 'Delete Candidate',
    clearAllCandidates: 'Clear All Candidates',
    cancelEdit: 'Cancel',
    academicYearNum: 'Academic Year Number (1-5)',
    toggleYearVoting: 'Toggle Voting for this Year',
    yearVotingOpen: 'Voting Open for this Year',
    yearVotingClosed: 'Voting Closed for this Year',
    yearVotingPausedMsg: 'Voting is currently paused for this academic year by the Election Committee.',
    openAllYears: 'Open Voting for All Years',
    closeAllYears: 'Close Voting for All Years',
    openSingleYearOnly: 'Open Voting for This Year Only',
    openYear2Only: 'Open Year 2 Only',
    yearControlPanelTitle: 'Year-by-Year Voting Control Panel',
    yearControlPanelSubtitle: 'Selectively enable or pause voting for specific academic years (e.g., open Year 2 only and pause all others).',
    openOnlyThisYear: 'Open Only This Year',
    securityIncidentsTitle: 'Security Monitoring & Rejected Attempts',
    securityIncidentsDesc: 'Real-time telemetry of double-voting attempts, invalid ID prefixes, and roster discrepancies.',
    thReason: 'Reason / Rejection Detail',
    thIp: 'Network IP',
    thSeverity: 'Severity',
    rosterManagerTitle: 'Official Student Roster (CSV / Text)',
    rosterManagerDesc: 'Paste student records (one per line: ID, Full Name) to enforce strict eligibility and flag suspicious names.',
    rosterPlaceholder: '2240207, Ahmad Ali Hassan\n2240208, Sarah Al-Shami\n2230101, Omar Khaled',
    importRosterBtn: 'Import Roster to Database',
    clearRosterBtn: 'Clear Roster',
    qrPosterTitle: 'Official Mobile Voting QR Poster',
    qrPosterDesc: 'Display on screens or print as posters in dentistry clinics and lecture halls for fast mobile voting.',
    generateQrBtn: 'View Printable QR Poster',
    resetElectionTitle: 'Reset Election Ballots',
    resetElectionDesc: 'Wipe all cast ballots and attempt logs while preserving candidates and academic year definitions.',
    resetConfirmPlaceholder: 'Type RESET_ELECTION to confirm',
    resetBtn: 'Wipe Election Ballots',
    votingClosedNotice: 'Voting is currently closed by order of the Supreme Election Committee.',
    votingClosedHelp: 'Please consult the Dean of Dentistry office or the Student Council Committee for polling hours.',
  },
};
