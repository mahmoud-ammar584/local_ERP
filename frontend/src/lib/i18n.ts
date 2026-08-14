import { create } from 'zustand'

type Language = 'en' | 'ar'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: (typeof window !== 'undefined'
    ? (localStorage.getItem('sarih_lang') as Language) ?? 'ar'
    : 'ar'),
  setLanguage: (lang) => {
    if (typeof window !== 'undefined') localStorage.setItem('sarih_lang', lang)
    set({ language: lang })
  },
}))

export function useLanguage() {
  return useLanguageStore()
}

const translations: Record<string, Record<Language, string>> = {
  appName:         { en: 'SARIH',              ar: 'صريح' },
  tagline:         { en: 'Radical Financial Truth', ar: 'الحقيقة المالية المطلقة' },
  dashboard:       { en: 'Dashboard',          ar: 'لوحة التحكم' },
  settings:        { en: 'Settings',           ar: 'الإعدادات' },
  integrations:    { en: 'Integrations',       ar: 'التكاملات' },
  signOut:         { en: 'Sign Out',           ar: 'تسجيل الخروج' },
  transactionVerdicts: { en: 'Transaction Verdicts', ar: 'أحكام المعاملات' },
  stalledCash:     { en: 'Stalled Cash',       ar: 'نقد متوقف' },
  orphanPayments:  { en: 'Orphan Payments',    ar: 'مدفوعات يتيمة' },
  refundSpikes:    { en: 'Refund Spikes',      ar: 'ارتفاعات الاسترداد' },
  noDataYet:       { en: 'No data yet.',       ar: 'لا توجد بيانات بعد.' },
  uploadToStart:   { en: 'Upload financial data to begin analysis.', ar: 'ارفع البيانات المالية لبدء التحليل.' },
  loading:         { en: 'Loading...',         ar: 'جارٍ التحميل...' },
  retry:           { en: 'Retry',              ar: 'إعادة المحاولة' },
  refresh:         { en: 'Refresh',            ar: 'تحديث' },
  radarTitle:      { en: 'Financial Radar',    ar: 'الرادار المالي' },
  refreshAnalysis: { en: 'Refresh Analysis',   ar: 'تحديث التحليل' },
  refreshing:      { en: 'Refreshing...',      ar: 'جارٍ التحديث...' },
  lastUpdated:     { en: 'Last updated',       ar: 'آخر تحديث' },
  keyMetrics:      { en: 'Key Metrics',        ar: 'المؤشرات الرئيسية' },
  burnRate:        { en: 'Burn Rate',          ar: 'معدل الإنفاق' },
  cashRunway:      { en: 'Cash Runway',        ar: 'مدة السيولة' },
  revenueGrowth:   { en: 'Revenue Growth',     ar: 'نمو الإيرادات' },
  netWorkingCapital: { en: 'Net Working Capital', ar: 'رأس المال العامل' },
  perMonth:        { en: '/mo',                ar: '/شهر' },
  months:          { en: 'months',             ar: 'أشهر' },
  uploadData:      { en: 'Upload Data',        ar: 'رفع البيانات' },
  dragDrop:        { en: 'Drag & drop or click to upload', ar: 'اسحب وأفلت أو انقر للرفع' },
  fact:            { en: 'FACT',               ar: 'الحقيقة' },
  cause:           { en: 'CAUSE',              ar: 'السبب' },
  risk:            { en: 'RISK',               ar: 'الخطر' },
  action:          { en: 'ACTION',             ar: 'الإجراء' },
  verdict:         { en: 'VERDICT',            ar: 'الحكم' },
  noReassurance:   { en: 'No reassurance.',    ar: 'لا مواساة.' },
  signIn:          { en: 'Sign In',            ar: 'تسجيل الدخول' },
  createAccount:   { en: 'Create Account',     ar: 'إنشاء حساب' },
  email:           { en: 'Email',              ar: 'البريد الإلكتروني' },
  password:        { en: 'Password',           ar: 'كلمة المرور' },
  organization:    { en: 'Organization',       ar: 'المنظمة' },
}

export function t(key: string, language: Language = 'ar'): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[language] ?? entry['en'] ?? key
}
