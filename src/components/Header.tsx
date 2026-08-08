import { HiTranslate } from 'react-icons/hi';
import CyrusIcon from '../assets/CyrusIcon.png';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { supportedLanguages, changeLanguage, type LanguageCode } from '../i18n';

interface HeaderProps {
  version: string;
}

export function Header({ version }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language?.split('-')[0]) || supportedLanguages[0];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (code: LanguageCode) => {
    await changeLanguage(code);
    setIsLangMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-raised">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-glow">
          <img src={CyrusIcon} alt="CyrusConvert" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-content tracking-tight">{t('app.title')}</h1>
          <p className="text-[10px] text-content-tertiary">v{version}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <p className="text-xs text-content-tertiary font-medium tracking-wide hidden sm:block">
          {t('app.subtitle')}
        </p>
        
        {/* Language Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-xs text-content-secondary"
            title={t('language.label')}
          >
            <HiTranslate className="text-sm" />
            <span>{currentLang.nativeName}</span>
          </button>
          
          {isLangMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-surface-raised border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-fade-in">
              <div className="max-h-64 overflow-y-auto py-1">
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-overlay transition-colors flex items-center justify-between ${
                      i18n.language?.split('-')[0] === lang.code ? 'text-accent bg-accent/5' : 'text-content-secondary'
                    }`}
                  >
                    <span>{lang.nativeName}</span>
                    {i18n.language?.split('-')[0] === lang.code && (
                      <span className="text-accent">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}