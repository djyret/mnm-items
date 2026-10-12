import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Compass, Ribbon } from './components/Ornaments'
import { StoreProvider, useStore } from './lib/store'
import { AltVy } from './pages/AltVy'
import { Forrad } from './pages/Forrad'
import { ItemPage } from './pages/ItemPage'
import { Karaktarer } from './pages/Karaktarer'
import { NyItem } from './pages/NyItem'

const NAV: [string, string, string][] = [
  ['/', 'Förråd', 'kista'],
  ['/ny', 'Lägg till', 'rulle'],
  ['/karaktarer', 'Karaktärer', 'hjalm'],
  ['/alt', 'Alt-vy', 'ryggsack'],
]

function Shell() {
  const { error } = useStore()
  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <NavLink to="/" className="brand">
            <span className="plaque">
              <span className="plaque__sub">Monsters &amp; Memories</span>
              <span className="plaque__title">Förrådet</span>
            </span>
            <Ribbon>Items att sälja / nyttja till alts</Ribbon>
          </NavLink>
          <nav className="nav">
            {NAV.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'} className="menu-btn">
                <span className="menu-btn__icon"><img src={`${import.meta.env.BASE_URL}ikoner/${icon}.webp`} alt="" /></span>
                <span className="menu-btn__label">{label}</span>
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
