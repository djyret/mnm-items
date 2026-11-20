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
import { NyItem } from './pages/NyItem'
import { Salda } from './pages/Salda'
import { Hjalp } from './pages/Hjalp'
import { Kapitel } from './pages/Kapitel'
import { KapitelLas } from './pages/KapitelLas'
import { KapitelSaga } from './pages/KapitelSaga'
import { Bildspel } from './pages/Bildspel'
import { Kronikan } from './pages/Kronikan'
import { Stilbibel } from './pages/Stilbibel'

/** Menyknapparna är färdiga bilder (järn = vanlig, guld = aktiv sida). Område = vad adminpanelen styr. */
const NAV: [string, Key, string, Area | null][] = [
  ['/', 'nav.stash', 'forrad', 'forradet'],
  ['/ny', 'nav.add', 'lagg-till', 'forradet'],
  ['/karaktarer', 'nav.characters', 'karaktarer', 'forradet'],
  ['/alt', 'nav.alts', 'alt-vy', 'forradet'],
  ['/salda', 'nav.sales', 'salda', 'forradet'],
  ['/kronikan', 'nav.chronicle', 'kronikan', 'kronikan'],
  ['/hjalp', 'nav.help', 'hjalp', null],
]
const MENU = `${import.meta.env.BASE_URL}ikoner/meny/`
/** Menyknappar som har en målad engelsk version i ikoner/meny/en/; övriga visar den svenska bilden. */
const EN_MENU = new Set<string>([])
const menuSrc = (lang: string, icon: string, suffix: string) =>
  `${MENU}${lang === 'en' && EN_MENU.has(icon) ? 'en/' : ''}${icon}${suffix}.webp`

const F = (page: ReactNode) => <RequireArea area="forradet">{page}</RequireArea>
const K = (page: ReactNode) => <RequireArea area="kronikan">{page}</RequireArea>

/** Startsidan är Förrådet; är det stängt men Krönikan öppen hamnar man där i stället. */
function Home() {
  const { canView, loading } = useAreas()
  const { loading: authLoading } = useAuth()
  if (loading || authLoading) return null
  if (!canView('forradet') && canView('kronikan')) return <Navigate to="/kronikan" replace />
  return F(<Forrad />)
}

function Shell() {
  const { error } = useStore()
  const { canEdit } = useAuth()
  const { canView } = useAreas()
  const { t, lang } = useI18n()
  return (
    <>
      {/* Utanför headern men ovanpå den: headerbildens mask skulle annars tona ut hörnet */}
      <AccountBar />
      <header className="hero">
        <div className="hero__inner">
          {/* Rubriken är inmålad i headerbilden; texten finns kvar för skärmläsare */}
          <NavLink to="/" className="brand-link" aria-label={t('app.homeLabel')}>
            <h1 className="sr-only">{t('app.headline')}</h1>
          </NavLink>
          <nav className="nav">
            {NAV.filter(([to, , , area]) => (to !== '/ny' || canEdit) && (!area || canView(area))).map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'} className="menu-img" aria-label={t(label)} title={t(label)}>
                <img className="menu-img__off" src={menuSrc(lang, icon, '')} alt="" />
                <img className="menu-img__on" src={menuSrc(lang, icon, '-aktiv')} alt="" />
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {error && <div className="page"><div className="alert">{t('app.dbError', { error })}</div></div>}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ny" element={F(<RequireEditor back={{ to: '/', label: 'Till förrådet' }}><NyItem /></RequireEditor>)} />
          <Route path="/item/:id" element={F(<ItemPage />)} />
          <Route path="/karaktarer" element={F(<Karaktarer />)} />
          <Route path="/alt" element={F(<AltVy />)} />
          <Route path="/salda" element={F(<Salda />)} />
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
      <footer className="site-foot">
        <Compass />
        <span>{t('app.footer')}</span>
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
