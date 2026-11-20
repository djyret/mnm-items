import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

/** Hela sidor som bara redaktörer får använda. Säkerheten ligger i databasen (RLS) – det här är UX. */
export function RequireEditor({ children, back }: { children: ReactNode; back?: { to: string; label: string } }) {
  const { session, membership, canEdit, loading, signIn } = useAuth()
  const { t } = useI18n()
  if (loading) return null
  if (canEdit) return <>{children}</>

  let text = t('admin.require.readOnly')
  if (!session) text = t('admin.require.signIn')
  else if (!membership || membership.status === 'pending') text = t('admin.require.pending')

  return (
    <div className="page">
      <div className="panel empty">
        <p>{text}</p>
        {!session && <button className="btn btn--primary" onClick={() => signIn()}>{t('account.signIn')}</button>}
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
