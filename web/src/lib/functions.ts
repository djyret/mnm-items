import { SUPABASE_KEY, SUPABASE_URL } from './supabase'

const WORD_KEY = 'mnm:gangord'

function readWord(): string {
  try {
    return localStorage.getItem(WORD_KEY) ?? ''
  } catch {
    return ''
  }
}

function storeWord(word: string) {
  try {
    localStorage.setItem(WORD_KEY, word)
  } catch {
    /* privat läge: ordet frågas efter nästa gång igen */
  }
}

/**
 * Anropar en Edge Function med gängordet. Saknas ordet, eller är det fel,
 * frågar sidan efter det en gång och försöker igen.
 */
export async function callFunction<T>(name: string, payload: unknown): Promise<T> {
  let word = readWord()
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!word) {
      const answer = window.prompt('Gängordet behövs för att använda AI-funktionerna (fråga i gänget):')
      if (!answer) throw new Error('Gängordet behövs för att använda AI-funktionerna.')
      word = answer.trim()
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, 'x-gang-word': word },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 401 && body.code === 'gang_word') {
      word = ''
      continue
    }
    if (!res.ok) throw new Error(body.error ?? `${name} svarade inte (${res.status})`)
    storeWord(word)
    return body as T
  }
  throw new Error('Fel gängord.')
}
