import type { ReactNode } from 'react'
import { AREAS, MIN_ROLE_LABEL, useAreas, type Area } from '../lib/access'
import { useAuth } from '../lib/auth'

/** Sidor i ett område som adminpanelen kan ha stängt för den som tittar. */
export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const { session, loading: authLoading, signIn } = useAuth()
  const { canView, minRole, loading } = useAreas()
  if (authLoading || loading) return null
  if (canView(area)) return <>{children}</>

  const label = AREAS.find((a) => a.area === area)!.label
  return (
    <div className="page">
      <div className="panel empty">
        <p>{label} är bara öppet för: {MIN_ROLE_LABEL[minRole[area]].toLowerCase()}.</p>
        {!session && <button className="btn btn--primary" onClick={() => signIn()}>Logga in med Discord</button>}
      </div>
    </div>
  )
}
