import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar from './ar.json';
import en from './en.json';
import de from './de.json';

// Every visible word comes from one translation file per language (ar.json, en.json, de.json).
// Data (product and category names) carries its own three names and is read through pick().
// The demo opens in English and offers English and German only. The Arabic words stay in ar.json — every share from
// the production system brings all three languages — but Arabic is not offered, and an earlier Arabic choice opens in
// English.

export const LOCALES = { ar, en, de };
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', numberLocale: 'en-GB' },
  { code: 'de', label: 'Deutsch', short: 'DE', dir: 'ltr', numberLocale: 'de-DE' },
];
export const DEFAULT_LANGUAGE = 'en';
const offered = (code) => LANGUAGES.some((l) => l.code === code);

const STORAGE_KEY = 'abosefen-demo:lang';
const ISO3_TO_ISO2 = { EGY: 'EG', ITA: 'IT', TUR: 'TR', CHN: 'CN', KOR: 'KR', DEU: 'DE', ESP: 'ES' };

function lookup(table, key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), table);
}

export function translate(lang, key, vars) {
  let text = lookup(LOCALES[lang], key);
  if (typeof text !== 'string') text = lookup(LOCALES.en, key);
  if (typeof text !== 'string') return key;
  if (vars) text = text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : m));
  return text;
}

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return offered(stored) ? stored : null;
  } catch {
    return null;
  }
}

const I18nContext = createContext(null);

export function I18nProvider({ children, initialLanguage }) {
  const [lang, setLangState] = useState(() => (offered(initialLanguage) ? initialLanguage : readStoredLanguage() || DEFAULT_LANGUAGE));
  const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    document.title = `${translate(lang, 'app.name')} — ${translate(lang, 'banner.text')}`;
  }, [lang, meta.dir]);

  const setLang = useCallback((code) => {
    if (!offered(code)) return;
    setLangState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* the choice simply is not remembered */
    }
  }, []);

  const value = useMemo(() => {
    const numberFormat = new Intl.NumberFormat(meta.numberLocale, { maximumFractionDigits: 2 });
    const t = (key, vars) => translate(lang, key, vars);
    return {
      lang,
      dir: meta.dir,
      isRtl: meta.dir === 'rtl',
      setLang,
      t,
      /** A name stored in three languages ({ ar, en, de }) in the chosen one. */
      pick: (names) => {
        if (!names) return '';
        if (typeof names === 'string') return names;
        return names[lang] || names.en || names.ar || '';
      },
      number: (n) => numberFormat.format(Number(n || 0)),
      money: (n) => `${numberFormat.format(Number(n || 0))} ${t('common.currency')}`,
      date: (iso, withTime = false) => {
        try {
          return new Intl.DateTimeFormat(meta.numberLocale, {
            dateStyle: 'medium',
            ...(withTime ? { timeStyle: 'short' } : {}),
          }).format(new Date(iso));
        } catch {
          return String(iso);
        }
      },
      country: (iso3) => {
        if (!iso3) return '';
        try {
          return new Intl.DisplayNames([lang], { type: 'region' }).of(ISO3_TO_ISO2[iso3] || iso3) || iso3;
        } catch {
          return iso3;
        }
      },
    };
  }, [lang, meta, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
