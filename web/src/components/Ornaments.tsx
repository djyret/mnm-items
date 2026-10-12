/** Pergamentband bakom undertiteln. */
export function Ribbon({ children }: { children: React.ReactNode }) {
  return (
    <div className="ribbon">
      <svg className="ribbon__bg" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="parch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9d7ac" />
            <stop offset="0.55" stopColor="#d4ba84" />
            <stop offset="1" stopColor="#a8875a" />
          </linearGradient>
        </defs>
        {/* vikta ändar */}
        <path d="M0 14 L34 14 L34 52 L0 52 L12 33 Z" fill="#8c6a40" />
        <path d="M400 14 L366 14 L366 52 L400 52 L388 33 Z" fill="#8c6a40" />
        <path d="M24 8 Q200 0 376 8 L376 48 Q200 40 24 48 Z" fill="url(#parch)" stroke="#5e4424" strokeWidth="1.5" />
        <path d="M30 13 Q200 6 370 13" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
      </svg>
      <span className="ribbon__text">{children}</span>
    </div>
  )
}

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
