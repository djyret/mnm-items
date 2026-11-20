import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Hela sidor som bara redaktörer får använda. Säkerheten ligger i databasen (RLS) – det här är UX. */
export function RequireEditor({ children, back }: { children: ReactNode; back?: { to: string; label: string } }) {
  const { session, membership, canEdit, loading, signIn } = useAuth()
  if (loading) return null
  if (canEdit) return <>{children}</>

  let text = 'Du har läsbehörighet. Be en admin om redaktörsbehörighet för att ändra.'
  if (!session) text = 'Du behöver vara inloggad som redaktör för att ändra här.'
  else if (!membership || membership.status === 'pending') text = 'Ditt konto väntar på att en admin godkänner det.'

  return (
    <div className="page">
      <div className="panel empty">
        <p>{text}</p>
        {!session && <button className="btn btn--primary" onClick={() => signIn()}>Logga in med Discord</button>}
        {back && <p><Link to={back.to}>{back.label}</Link></p>}
      </div>
    </div>
  )
}

/** Inline-knappar och länkar som bara redaktörer ser. */
export function EditorOnly({ children }: { children: ReactNode }) {
  const { canEdit } = useAuth()
  return canEdit ? <>{children}</> : null
}
