import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Samma två flikar på samma plats i läsvyn och verkstaden. */
export function ChapterTabs({ id }: { id: string }) {
  const { canEdit } = useAuth()
  return (
    <nav className="kr-tabs" aria-label="Kapitlet">
      <NavLink end to={`/kronikan/${id}`} className="kr-tab">Läs</NavLink>
      <NavLink to={`/kronikan/${id}/saga`} className="kr-tab">Saga</NavLink>
      {canEdit && <NavLink to={`/kronikan/${id}/verkstad`} className="kr-tab">Verkstad</NavLink>}
    </nav>
  )
}
