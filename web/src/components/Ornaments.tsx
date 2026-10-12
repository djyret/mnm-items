/** Kompassros som sidfotsornament. */
export function Compass() {
  return (
    <svg className="compass" viewBox="0 0 100 100" aria-hidden>
      <g fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="30" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="24" strokeWidth="0.6" strokeDasharray="2 3" />
      </g>
      <g fill="currentColor">
        <path d="M50 4 L55 45 L50 50 L45 45 Z" />
        <path d="M50 96 L45 55 L50 50 L55 55 Z" opacity=".75" />
        <path d="M4 50 L45 45 L50 50 L45 55 Z" opacity=".75" />
        <path d="M96 50 L55 55 L50 50 L55 45 Z" opacity=".75" />
        <path d="M22 22 L47 47 L44 50 Z M78 22 L53 47 L50 44 Z M22 78 L47 53 L50 56 Z M78 78 L53 53 L56 50 Z" opacity=".5" />
        <circle cx="50" cy="50" r="3" />
      </g>
    </svg>
  )
}
