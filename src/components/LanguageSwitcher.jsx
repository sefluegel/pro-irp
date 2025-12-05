// src/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-medium border border-white/20 transition-all"
      title={t('language')}
    >
      <Globe size={18} />
      <span className="text-sm font-semibold">
        {i18n.language === 'en' ? 'ES' : 'EN'}
      </span>
    </button>
  );
}
