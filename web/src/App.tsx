import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Compass } from './components/Ornaments'
import { StoreProvider, useStore } from './lib/store'
import { AltVy } from './pages/AltVy'
import { Forrad } from './pages/Forrad'
import { ItemPage } from './pages/ItemPage'
import { Karaktarer } from './pages/Karaktarer'
import { NyItem } from './pages/NyItem'
import { Salda } from './pages/Salda'
import { Hjalp } from './pages/Hjalp'
import { Kapitel } from './pages/Kapitel'
import { KapitelLas } from './pages/KapitelLas'
import { Kronikan } from './pages/Kronikan'
import { Stilbibel } from './pages/Stilbibel'

/** Menyknapparna är färdiga bilder (järn = vanlig, guld = aktiv sida). */
const NAV: [string, string, string][] = [
  ['/', 'Förråd', 'forrad'],
  ['/ny', 'Lägg till', 'lagg-till'],
  ['/karaktarer', 'Karaktärer', 'karaktarer'],
  ['/alt', 'Alts', 'alt-vy'],
  ['/salda', 'Försäljning', 'salda'],
  ['/kronikan', 'Krönikan', 'kronikan'],
  ['/hjalp', 'Hjälp', 'hjalp'],
]
const MENU = `${import.meta.env.BASE_URL}ikoner/meny/`

function Shell() {
  const { error } = useStore()
  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          {/* Rubriken är inmålad i headerbilden; texten finns kvar för skärmläsare */}
          <NavLink to="/" className="brand-link" aria-label="Förrådet – till startsidan">
            <h1 className="sr-only">Förrådet – Monsters &amp; Memories. Items att sälja / nyttja till alts</h1>
          </NavLink>
          <nav className="nav">
            {NAV.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'} className="menu-img" aria-label={label} title={label}>
                <img className="menu-img__off" src={`${MENU}${icon}.webp`} alt="" />
                <img className="menu-img__on" src={`${MENU}${icon}-aktiv.webp`} alt="" />
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        {error && <div className="page"><div className="alert">Kunde inte nå databasen: {error}</div></div>}
        <Routes>
          <Route path="/" element={<Forrad />} />
          <Route path="/ny" element={<NyItem />} />
          <Route path="/item/:id" element={<ItemPage />} />
          <Route path="/karaktarer" element={<Karaktarer />} />
          <Route path="/alt" element={<AltVy />} />
          <Route path="/salda" element={<Salda />} />
          <Route path="/kronikan" element={<Kronikan />} />
          <Route path="/kronikan/stil" element={<Stilbibel />} />
          <Route path="/kronikan/:id" element={<KapitelLas />} />
          <Route path="/kronikan/:id/verkstad" element={<Kapitel />} />
          <Route path="/hjalp" element={<Hjalp />} />
        </Routes>
      </main>
      <footer className="site-foot">
        <Compass />
        <span>Delad loot för framtida äventyr</span>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </HashRouter>
  )
}
