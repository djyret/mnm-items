import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import type { AppRole, Membership, MembershipStatus } from '../lib/types'

// Gäst: vän utanför gänget (gästernas armory och krönikan, inte förrådet). Välj innan man godkänner.
const ROLES: AppRole[] = ['guest', 'reader', 'editor', 'admin']

/** Väntande överst, så nya konton syns direkt. */
const STATUS_ORDER: Record<MembershipStatus, number> = { pending: 0, active: 1, suspended: 2 }

/** Admin godkänner nya Discord-konton, sätter roll och spärrar. Ändringar går via admin_set_membership().
 *  Visas på Admin-sidan, som redan kräver admin. */
export function MembersPanel() {
  const { isAdmin, membership: me, reloadMembership } = useAuth()
  const { t, locale } = useI18n()
  const [rows, setRows] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('memberships').select('*').order('created_at')
    if (error) setError(error.message)
    else setRows((data as Membership[]).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  async function update(m: Membership, role: AppRole, status: MembershipStatus) {
    setError(null)
    setBusy(m.user_id)
    const { error } = await supabase.rpc('admin_set_membership', { target: m.user_id, new_role: role, new_status: status })
    if (error) setError(error.message)
    await load()
    if (m.user_id === me?.user_id) await reloadMembership()
    setBusy(null)
  }

  const pending = rows.filter((r) => r.status === 'pending').length

  return (
    <>
      <div className="panel">
        <h3 className="panel-title">{t('admin.members.title')}</h3>
        {error && <div className="alert">{error}</div>}
        <p className="members__intro">
          {t('admin.members.intro')}
          {pending > 0 && <> <strong>{t('admin.members.pendingCount', { n: pending })}</strong></>}
        </p>
        {loading ? (
          <div className="empty">{t('common.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="empty">{t('admin.members.empty')}</div>
        ) : (
          <ul className="members">
            {rows.map((m) => {
              const self = m.user_id === me?.user_id
              const disabled = busy === m.user_id
              return (
                <li key={m.user_id} className={`members__row members__row--${m.status}`}>
                  <div className="members__who">
                    <span>
                      <strong>{m.display_name ?? t('admin.members.unknownName')}</strong>
                      {self && <span className="members__self"> {t('admin.members.you')}</span>}
                    </span>
                    <small>
                      {t('admin.members.since', {
                        status: t(`admin.status.${m.status}`),
                        date: new Date(m.created_at).toLocaleDateString(locale),
                      })}
                    </small>
                  </div>
                  <select
                    aria-label={t('admin.members.roleFor', { name: m.display_name ?? t('admin.members.theAccount') })}
                    value={m.role}
                    disabled={disabled}
                    onChange={(e) => update(m, e.target.value as AppRole, m.status)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                  </select>
                  <div className="members__actions">
                    {m.status !== 'active' && (
                      <button className="btn btn--small btn--primary" disabled={disabled} onClick={() => update(m, m.role, 'active')}>
                        {m.status === 'pending' ? t('admin.members.approve') : t('admin.members.reactivate')}
                      </button>
                    )}
                    {m.status !== 'suspended' && !self && (
                      <button className="btn btn--small btn--ghost" disabled={disabled} onClick={() => update(m, m.role, 'suspended')}>
                        {t('admin.members.suspend')}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
