import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth, type Access } from './auth'
import { supabase } from './supabase'

/** Områden som adminpanelen styr. Databasen spärrar läsningen; det här styr meny och sidor. */
export type Area = 'forradet' | 'kronikan' | 'stilbibeln'

export const AREAS: { area: Area; label: string; covers: string }[] = [
  { area: 'forradet', label: 'Förrådet', covers: 'Förråd, Karaktärer, Alts och Försäljning' },
  { area: 'kronikan', label: 'Krönikan', covers: 'Alla kapitel; kapitlens egen synlighet gäller också' },
  { area: 'stilbibeln', label: 'Stilbibeln', covers: 'Stilprompten och sidan Stilbibel' },
]

export const MIN_ROLE_LABEL: Record<Access, string> = {
  visitor: 'Alla, även utloggade',
  reader: 'Inloggade i gänget',
  editor: 'Redaktörer',
  admin: 'Bara admin',
}

const RANK: Record<Access, number> = { visitor: 0, reader: 1, editor: 2, admin: 3 }

interface AreaAccess {
  minRole: Record<Area, Access>
  loading: boolean
  canView: (area: Area) => boolean
  reload: () => Promise<void>
}

const AreaContext = createContext<AreaAccess | null>(null)

// Tills inställningen laddats visas allt: databasen spärrar ändå det som inte får läsas
const OPEN: Record<Area, Access> = { forradet: 'visitor', kronikan: 'visitor', stilbibeln: 'visitor' }

export function AreaProvider({ children }: { children: ReactNode }) {
  const { access } = useAuth()
  const [minRole, setMinRole] = useState(OPEN)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await supabase.from('area_access').select('area, min_role')
    if (data) {
      setMinRole({ ...OPEN, ...Object.fromEntries(data.map((r) => [r.area, r.min_role])) })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo<AreaAccess>(() => ({
    minRole,
    loading,
    canView: (area) => RANK[access] >= RANK[minRole[area]],
    reload,
  }), [minRole, loading, access, reload])

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>
}

export function useAreas(): AreaAccess {
  const ctx = useContext(AreaContext)
  if (!ctx) throw new Error('useAreas utanför AreaProvider')
  return ctx
}
