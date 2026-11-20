import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

/** Kapitlet finns inte – eller är gruppinternt/utkast och syns inte för den som tittar. */
export function ChapterMissing({ loading }: { loading: boolean }) {
  const { session, signIn } = useAuth()
  const { t } = useI18n()
  return (
    <div className="page">
      <div className="panel empty">
        {loading ? t('common.loading') : (
          <>
            <p>{t('kronikan.missing.text')}</p>
            {!session && <button className="btn btn--primary" onClick={() => signIn()}>{t('account.signIn')}</button>}
            <p><Link to="/kronikan">{t('kronikan.toChronicle')}</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
