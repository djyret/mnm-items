import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth, type Access } from './auth'
import { supabase } from './supabase'

/** Områden som adminpanelen styr. Databasen spärrar läsningen; det här styr meny och sidor. */
export type Area = 'forradet' | 'kronikan' | 'stilbibeln' | 'gaster'

/** Namn och beskrivning slås upp vid rendering så att språkbytet slår igenom:
 *  t(`admin.area.${area}`), t(`admin.area.${area}.covers`) och t(`admin.minRole.${nivå}`). */
export const AREAS: Area[] = ['forradet', 'kronikan', 'stilbibeln', 'gaster']

// Samma steg som can_view_area() i databasen: besökare < gäst < läsare < redaktör < admin
const RANK: Record<Access, number> = { visitor: 0, guest: 1, reader: 2, editor: 3, admin: 4 }

/** Lägsta roll som ser ett område (area_access.min_role). */
export type AreaLevel = Access

interface AreaAccess {
  minRole: Record<Area, AreaLevel>
  loading: boolean
  canView: (area: Area) => boolean
  reload: () => Promise<void>
}

const AreaContext = createContext<AreaAccess | null>(null)

// Tills inställningen laddats visas allt: databasen spärrar ändå det som inte får läsas
const OPEN: Record<Area, AreaLevel> = { forradet: 'visitor', kronikan: 'visitor', stilbibeln: 'visitor', gaster: 'visitor' }

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
