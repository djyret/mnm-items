import { CLASSES, classIcon } from '../lib/constants'
import { useI18n } from '../lib/i18n'

/** Klassikon i en mörk ruta; okänd klass visar koden. */
export function ClassIcon({ code, size = 40 }: { code: string | null | undefined; size?: number }) {
  const { t } = useI18n()
  const src = code ? classIcon(code) : null
  return (
    <span className="class-icon" style={{ width: size, height: size }} title={code ? CLASSES[code] || code : t('forradet.class.none')}>
      {src ? <img src={src} alt={code ?? ''} /> : <span>{code ?? '?'}</span>}
    </span>
  )
}

/** Rutnät med klassikoner att välja en klass i. Klick på vald klass avmarkerar. */
export function ClassPicker({ classes, value, onChange, wide = false }: {
  classes: string[]
  value: string
  onChange: (v: string) => void
  wide?: boolean
}) {
  return (
    <div className={`class-picker${wide ? ' class-picker--wide' : ''}`}>
      {classes.map((c) => (
        <button
          key={c}
          type="button"
          className={`class-picker__btn${value === c ? ' is-active' : ''}`}
          title={`${c}${CLASSES[c] ? ` – ${CLASSES[c]}` : ''}`}
          aria-pressed={value === c}
          onClick={() => onChange(value === c ? '' : c)}
        >
          <ClassIcon code={c} size={34} />
        </button>
      ))}
    </div>
  )
}
