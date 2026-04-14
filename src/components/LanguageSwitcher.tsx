import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';

const labels: Record<Language, string> = { uz: 'UZ', en: 'ENG', ru: 'RUS' };

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm font-mono font-medium hover:bg-secondary/80 transition-colors">
        {labels[language]}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-1 py-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[80px]">
        {(Object.keys(labels) as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`block w-full text-left px-3 py-1.5 text-sm font-mono transition-colors ${
              lang === language ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
            }`}
          >
            {labels[lang]}
          </button>
        ))}
      </div>
    </div>
  );
};
