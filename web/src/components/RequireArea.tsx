import type { ReactNode } from 'react'
import { useAreas, type Area } from '../lib/access'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

/** Sidor i ett område som adminpanelen kan ha stängt för den som tittar. */
export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const { session, loading: authLoading, signIn } = useAuth()
  const { canView, minRole, loading } = useAreas()
  const { t } = useI18n()
  if (authLoading || loading) return null
  if (canView(area)) return <>{children}</>

  return (
    <div className="page">
      <div className="panel empty">
        <p>{t(`admin.require.closed.${minRole[area]}`, { area: t(`admin.area.${area}`) })}</p>
        {!session && <button className="btn btn--primary" onClick={() => signIn()}>{t('account.signIn')}</button>}
      </div>
    </div>
  )
}
