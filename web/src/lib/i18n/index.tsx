import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { strings, type Key } from './strings'

/**
 * Språkval svenska/engelska. Texterna ligger per område i ./strings/*.ts, där den svenska
 * ordboken är källan och den engelska måste ha exakt samma nycklar (typkontrollerat).
 *
 *   const { t } = useI18n()
 *   t('nav.stash')                      // "Förråd" / "Stash"
 *   t('forrad.count', { n: 3 })         // "{n} items" med {n} ersatt
 *
 * Utanför React (t.ex. i lib-funktioner): getLang() och translate().
 */
export type Lang = 'sv' | 'en'

const KEY = 'mnm:lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'sv' || saved === 'en') return saved
  } catch {
    /* privat läge */
  }
  return navigator.language?.toLowerCase().startsWith('sv') ? 'sv' : 'en'
}

let current: Lang = initialLang()

/** Aktuellt språk, för kod utanför komponenter (AI-anrop, datumformat). */
export function getLang(): Lang {
  return current
}

/** BCP 47-locale för datum och tal. */
export function locale(lang: Lang = current): string {
  return lang === 'sv' ? 'sv-SE' : 'en-GB'
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const text: string = strings[lang][key] ?? strings.sv[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: Key, vars?: Record<string, string | number>) => string
  locale: string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  useEffect(() => {
    current = lang
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    current = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* privat läge: valet gäller tills sidan laddas om */
    }
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    locale: locale(lang),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n utanför I18nProvider')
  return ctx
}

export type { Key }
