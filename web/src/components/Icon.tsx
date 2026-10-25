/** Små ritade ikoner i samma streck, i stället för tecken som ‹ › ▶. */
const PATHS = {
  vanster: 'M15 5l-7 7 7 7',
  hoger: 'M9 5l7 7-7 7',
  spela: 'M8 5v14l11-7z',
  stang: 'M6 6l12 12M18 6L6 18',
  upp: 'M5 15l7-7 7 7',
  ner: 'M5 9l7 7 7-7',
  plus: 'M12 5v14M5 12h14',
}

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS; size?: number }) {
  const filled = name === 'spela'
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}
