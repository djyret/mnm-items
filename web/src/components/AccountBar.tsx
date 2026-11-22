import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n, type Lang } from '../lib/i18n'
import type { ViewAs } from '../lib/types'

/** Liten kontoruta uppe till höger: språkval, logga in med Discord, eller namn, roll och utloggning. */
export function AccountBar() {
  const { session, membership, access, isAdmin, realAdmin, loading, signIn, signOut } = useAuth()
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
          {realAdmin && <ViewAsSwitch />}
          {isAdmin && <Link className="account__link" to="/admin">{t('account.admin')}</Link>}
          <button type="button" className="account__link" onClick={signOut}>{t('account.signOut')}</button>
        </>
      )}
    </div>
  )
}

const VIEW_AS: (ViewAs | null)[] = [null, 'editor', 'reader', 'guest', 'visitor']

/** Bara för riktiga admins: se sidan som en annan roll. Bytet görs i databasen (set_view_as). */
function ViewAsSwitch() {
  const { viewAs, setViewAs } = useAuth()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  return (
    <label className={`account__viewas${viewAs ? ' is-active' : ''}`} title={t('account.viewAsHelp')}>
      <span>{t('account.viewAs')}</span>
      <select
        value={viewAs ?? ''}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true)
          const err = await setViewAs((e.target.value || null) as ViewAs | null)
          if (err) { setBusy(false); window.alert(err) }
        }}
      >
        {VIEW_AS.map((r) => <option key={r ?? 'own'} value={r ?? ''}>{t(`role.${r ?? 'admin'}`)}</option>)}
      </select>
    </label>
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
