import type { ReactNode } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { AccountBar } from './components/AccountBar'
import { Compass } from './components/Ornaments'
import { RequireArea } from './components/RequireArea'
import { RequireEditor } from './components/RequireEditor'
import { AreaProvider, useAreas, type Area } from './lib/access'
import { AuthProvider, useAuth } from './lib/auth'
import { I18nProvider, useI18n, type Key } from './lib/i18n'
import { StoreProvider, useStore } from './lib/store'
import { Admin } from './pages/Admin'
import { AltVy } from './pages/AltVy'
import { Forrad } from './pages/Forrad'
import { ItemPage } from './pages/ItemPage'
import { Karaktarer } from './pages/Karaktarer'
import { Armory } from './pages/Armory'
import { WikiCredit } from './components/Wiki'
import { NyItem } from './pages/NyItem'
import { Salda } from './pages/Salda'
import { Hjalp } from './pages/Hjalp'
import { Kapitel } from './pages/Kapitel'
import { KapitelLas } from './pages/KapitelLas'
import { KapitelSaga } from './pages/KapitelSaga'
import { Bildspel } from './pages/Bildspel'
import { Kronikan } from './pages/Kronikan'
import { Stilbibel } from './pages/Stilbibel'
import { Start } from './pages/Start'
import { Gaster } from './pages/Gaster'
import { GastArmory } from './pages/GastArmory'

/** Menyn: läderskyltar med målad ikon och text i HTML (guldläder = aktiv sida). Område = vad adminpanelen styr. */
const NAV: [string, Key, string, Area | null][] = [
  ['/', 'nav.home', 'hem', null],
  ['/forrad', 'nav.stash', 'forrad', 'forradet'],
  ['/ny', 'nav.add', 'lagg-till', 'forradet'],
  ['/karaktarer', 'nav.characters', 'karaktarer', 'forradet'],
  ['/alt', 'nav.alts', 'alts', 'forradet'],
  ['/salda', 'nav.sales', 'forsaljning', 'forradet'],
  ['/gaster', 'nav.guests', 'gaster', 'gaster'],
  ['/kronikan', 'nav.chronicle', 'kronikan', 'kronikan'],
  ['/hjalp', 'nav.help', 'hjalp', null],
]
const UI = `${import.meta.env.BASE_URL}ui/`

const F = (page: ReactNode) => <RequireArea area="forradet">{page}</RequireArea>
const K = (page: ReactNode) => <RequireArea area="kronikan">{page}</RequireArea>

function Shell() {
  const { error } = useStore()
  const { canEdit } = useAuth()
  const { canView } = useAreas()
  const { t, lang } = useI18n()
  return (
    <>
      {/* HashRouter: en vanlig #-länk skulle byta route, så hopplänken flyttar fokus själv */}
      <a href="#innehall" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('innehall')?.focus() }}>
        {t('app.skipToContent')}
      </a>
      {/* Utanför headern men ovanpå den: headerbildens mask skulle annars tona ut hörnet */}
      <AccountBar />
      <header className="hero">
        {/* Ljusen i bandet fladdrar: ett sken på väggen och den målade lågan själv, se .flame i CSS */}
        <div className="flames" aria-hidden="true">
          {['vanster', 'hoger', 'hylla'].map((f) => (
            <span key={f} className={`flame flame--${f}`}><span className="flame__glow" /><span className="flame__fire" /></span>
          ))}
        </div>
        <div className="hero__inner">
          {/* Skylten är en målad bild per språk; rubriken finns kvar som text för skärmläsare */}
          <NavLink to="/" className="brand-link" aria-label={t('app.homeLabel')}>
            <img className="brand-sign" src={`${import.meta.env.BASE_URL}bilder/skylt-${lang}.webp`} alt="" />
            <h1 className="sr-only">{t('app.headline')}</h1>
          </NavLink>
        </div>
      </header>
      {/* Menyn står längs vänsterkanten och följer med när man skrollar; under 900px blir den en rad */}
      <div className="shell">
        <nav className="nav nav--rail" aria-label={t('nav.label')}>
          {NAV.filter(([to, , , area]) => (to !== '/ny' || canEdit) && (!area || canView(area))).map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className="menu-item">
              <img className="menu-item__ikon" src={`${UI}ikon-${icon}.webp`} alt="" />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <main id="innehall" tabIndex={-1}>
        {error && <div className="page"><div className="alert">{t('app.dbError', { error })}</div></div>}
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/forrad" element={F(<Forrad />)} />
          <Route path="/ny" element={F(<RequireEditor back={{ to: '/forrad', label: 'Till förrådet' }}><NyItem /></RequireEditor>)} />
          <Route path="/item/:id" element={F(<ItemPage />)} />
          <Route path="/karaktarer" element={F(<Karaktarer />)} />
          <Route path="/karaktar/:id" element={F(<Armory />)} />
          <Route path="/alt" element={F(<AltVy />)} />
          <Route path="/salda" element={F(<Salda />)} />
          <Route path="/gaster" element={<RequireArea area="gaster"><Gaster /></RequireArea>} />
          <Route path="/gast/:id" element={<RequireArea area="gaster"><GastArmory /></RequireArea>} />
          <Route path="/kronikan" element={K(<Kronikan />)} />
          <Route path="/kronikan/stil" element={<RequireArea area="stilbibeln">{K(<Stilbibel />)}</RequireArea>} />
          <Route path="/kronikan/:id" element={K(<KapitelLas />)} />
          <Route path="/kronikan/:id/verkstad" element={K(<RequireEditor back={{ to: '/kronikan', label: 'Till krönikan' }}><Kapitel /></RequireEditor>)} />
          <Route path="/kronikan/:id/saga" element={K(<KapitelSaga />)} />
          <Route path="/kronikan/:id/bildspel" element={K(<Bildspel />)} />
          <Route path="/hjalp" element={<Hjalp />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/medlemmar" element={<Navigate to="/admin" replace />} />
        </Routes>
        </main>
      </div>
      <footer className="site-foot">
        <Compass />
        <span>{t('app.footer')}</span>
        <WikiCredit />
      </footer>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <I18nProvider>
        <AuthProvider>
          <AreaProvider>
            <StoreProvider>
              <Shell />
            </StoreProvider>
          </AreaProvider>
        </AuthProvider>
      </I18nProvider>
    </HashRouter>
  )
}
