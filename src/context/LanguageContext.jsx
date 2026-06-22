import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '@/constants/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('pandora_language') || 'es';
  });

  useEffect(() => {
    localStorage.setItem('pandora_language', language);
  }, [language]);

  // Robust translation function supporting nested paths (e.g. t('header.nav.home'))
  const t = (path, defaultValue = '') => {
    const keys = path.split('.');
    
    // Attempt to read from the active language, falling back to 'es'
    let current = TRANSLATIONS[language] || TRANSLATIONS['es'] || TRANSLATIONS;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Spanish root if the key is not found in the current language
        let fallback = TRANSLATIONS['es'] || TRANSLATIONS;
        let temp = fallback;
        let found = true;
        for (const fKey of keys) {
          if (temp && typeof temp === 'object' && fKey in temp) {
            temp = temp[fKey];
          } else {
            found = false;
            break;
          }
        }
        return found ? temp : (defaultValue || path);
      }
    }
    
    return current !== undefined ? current : (defaultValue || path);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
