import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Kapitlet finns inte – eller är gruppinternt/utkast och syns inte för den som tittar. */
export function ChapterMissing({ loading }: { loading: boolean }) {
  const { session, signIn } = useAuth()
  return (
    <div className="page">
      <div className="panel empty">
        {loading ? 'Laddar…' : (
          <>
            <p>Kapitlet finns inte, eller så kan bara gänget läsa det.</p>
            {!session && <button className="btn btn--primary" onClick={() => signIn()}>Logga in med Discord</button>}
            <p><Link to="/kronikan">Till krönikan</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
