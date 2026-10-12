import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './lib/store'
import { AltVy } from './pages/AltVy'
import { Forrad } from './pages/Forrad'
import { ItemPage } from './pages/ItemPage'
import { Karaktarer } from './pages/Karaktarer'
import { NyItem } from './pages/NyItem'

function Shell() {
  const { error } = useStore()
  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <NavLink to="/" className="brand">
            <span className="brand__mark" aria-hidden>⚔</span>
            <span>
              <span className="brand__title">Förrådet</span>
              <span className="brand__sub">Monsters &amp; Memories</span>
            </span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>Förråd</NavLink>
            <NavLink to="/ny">Lägg till</NavLink>
            <NavLink to="/karaktarer">Karaktärer</NavLink>
            <NavLink to="/alt">Alt-vy</NavLink>
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
