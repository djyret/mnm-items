import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Character, Item } from './types'

interface Store {
  characters: Character[]
  items: Item[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  charById: (id: string | null | undefined) => Character | undefined
}

const StoreContext = createContext<Store | null>(null)

/** Hela förrådet laddas in i minnet – några hundra items filtreras snabbast lokalt. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [c, i] = await Promise.all([
      supabase.from('characters').select('*').order('name'),
      supabase.from('items').select('*').order('created_at', { ascending: false }),
    ])
    if (c.error || i.error) {
      setError((c.error ?? i.error)!.message)
    } else {
      setError(null)
      setCharacters(c.data as Character[])
      setItems(i.data as Item[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo<Store>(() => {
    const map = new Map(characters.map((c) => [c.id, c]))
    return {
      characters,
      items,
      loading,
      error,
      reload,
      charById: (id) => (id ? map.get(id) : undefined),
    }
  }, [characters, items, loading, error, reload])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore utanför StoreProvider')
  return s
}
