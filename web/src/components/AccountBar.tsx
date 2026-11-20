import { Link } from 'react-router-dom'
import { ROLE_LABEL, useAuth } from '../lib/auth'

/** Liten kontoruta i headern: logga in med Discord, eller namn, roll och utloggning. */
export function AccountBar() {
  const { session, membership, access, isAdmin, loading, signIn, signOut } = useAuth()
  if (loading) return null

  if (!session) {
    return (
      <div className="account">
        <button type="button" className="account__link" onClick={signIn}>Logga in med Discord</button>
      </div>
    )
  }

  const name = membership?.display_name ?? session.user.email ?? 'Inloggad'
  const status =
    membership?.status === 'pending' ? 'väntar på godkännande'
    : membership?.status === 'suspended' ? 'spärrad'
    : ROLE_LABEL[access].toLowerCase()

  return (
    <div className="account">
      <span className="account__who">
        {name} <span className="account__role">· {status}</span>
      </span>
      {isAdmin && <Link className="account__link" to="/medlemmar">Medlemmar</Link>}
      <button type="button" className="account__link" onClick={signOut}>Logga ut</button>
    </div>
  )
}
