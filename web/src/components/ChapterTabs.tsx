import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

/** Samma två flikar på samma plats i läsvyn och verkstaden. */
export function ChapterTabs({ id }: { id: string }) {
  const { canEdit } = useAuth()
  const { t } = useI18n()
  return (
    <nav className="kr-tabs" aria-label={t('kronikan.chapter')}>
      <NavLink end to={`/kronikan/${id}`} className="kr-tab">{t('kronikan.tabs.read')}</NavLink>
      <NavLink to={`/kronikan/${id}/saga`} className="kr-tab">{t('kronikan.tabs.saga')}</NavLink>
      {canEdit && <NavLink to={`/kronikan/${id}/verkstad`} className="kr-tab">{t('kronikan.tabs.workshop')}</NavLink>}
    </nav>
  )
}
