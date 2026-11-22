// Rasval: spelets 13 raser. Ett gammalt fritt skrivet värde som inte känns igen står kvar som eget val.
import { RACES, raceCode } from '../lib/basestats'
import { useI18n } from '../lib/i18n'

export function RacePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useI18n()
  const code = raceCode(value)
  const current = code ? RACES[code] : value ?? ''
  const names = Object.values(RACES).sort((a, b) => a.localeCompare(b))
  return (
    <label className="field">
      <span>{t('forradet.chars.race')}</span>
      <select value={current} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t('forradet.chars.raceNone')}</option>
        {current && !code && <option value={current}>{current}</option>}
        {names.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  )
}
