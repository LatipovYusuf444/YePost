export default function GoldCartIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="cart-glow" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cart-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="podium-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E6EDF7" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="120" rx="98" ry="98" fill="url(#cart-glow)" />

      {/* podium */}
      <ellipse cx="120" cy="182" rx="58" ry="13" fill="#D6E2F2" opacity="0.55" />
      <path d="M62 172c0-8 26-14 58-14s58 6 58 14-26 15-58 15-58-7-58-15Z" fill="url(#podium-gradient)" stroke="#D6E2F2" strokeWidth="1.5" />
      <path d="M62 172v7c0 8 26 15 58 15s58-7 58-15v-7" fill="none" stroke="#D6E2F2" strokeWidth="1.5" />

      {/* sparkles */}
      <g stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M52 84v14M45 91h14" />
        <path d="M188 66v11M182.5 71.5h11" />
        <path d="M196 118v10M191 123h10" />
        <path d="M44 138v9M39.5 142.5h9" />
      </g>
      <circle cx="70" cy="60" r="2.4" fill="#60A5FA" />
      <circle cx="172" cy="150" r="2.2" fill="#60A5FA" />

      {/* cart wheels */}
      <circle cx="103" cy="158" r="8.5" fill="url(#cart-gold)" />
      <circle cx="148" cy="158" r="8.5" fill="url(#cart-gold)" />
      <circle cx="103" cy="158" r="3" fill="#FFFFFF" opacity="0.7" />
      <circle cx="148" cy="158" r="3" fill="#FFFFFF" opacity="0.7" />

      {/* cart basket */}
      <path
        d="M84 96h13l9 52h49l11-38H104"
        fill="none"
        stroke="url(#cart-gold)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M111 110h60"
        stroke="url(#cart-gold)"
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M117 122h50"
        stroke="url(#cart-gold)"
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* handle */}
      <path
        d="M84 96c0-9 5-16 15-16"
        fill="none"
        stroke="url(#cart-gold)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
