import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n, type Lang } from '../lib/i18n'

/** Liten kontoruta uppe till höger: språkval, logga in med Discord, eller namn, roll och utloggning. */
export function AccountBar() {
  const { session, membership, access, isAdmin, loading, signIn, signOut } = useAuth()
  const { t } = useI18n()

  const status =
    membership?.status === 'pending' ? t('account.pending')
    : membership?.status === 'suspended' ? t('account.suspended')
    : t(`role.${access}`).toLowerCase()

  return (
    <div className="account">
      <LangSwitch />
      {loading ? null : !session ? (
        <button type="button" className="account__link" onClick={signIn}>{t('account.signIn')}</button>
      ) : (
        <>
          <span className="account__who">
            {membership?.display_name ?? session.user.email ?? t('account.signedIn')}{' '}
            <span className="account__role">· {status}</span>
          </span>
          {isAdmin && <Link className="account__link" to="/admin">{t('account.admin')}</Link>}
          <button type="button" className="account__link" onClick={signOut}>{t('account.signOut')}</button>
        </>
      )}
    </div>
  )
}

const LANGS: Lang[] = ['sv', 'en']

function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <span className="account__lang" role="group" aria-label={t('account.language')}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={`account__link${l === lang ? ' is-active' : ''}`}
          aria-pressed={l === lang}
          lang={l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  )
}
