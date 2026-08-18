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
          <stop offset="0%" stopColor="#E1B650" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#E1B650" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cart-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E9C978" />
          <stop offset="45%" stopColor="#C89223" />
          <stop offset="100%" stopColor="#96690F" />
        </linearGradient>
        <linearGradient id="podium-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#F3EADA" />
        </linearGradient>
      </defs>

      <ellipse cx="120" cy="120" rx="98" ry="98" fill="url(#cart-glow)" />

      {/* podium */}
      <ellipse cx="120" cy="182" rx="58" ry="13" fill="#E6D2A8" opacity="0.55" />
      <path d="M62 172c0-8 26-14 58-14s58 6 58 14-26 15-58 15-58-7-58-15Z" fill="url(#podium-gradient)" stroke="#E6D2A8" strokeWidth="1.5" />
      <path d="M62 172v7c0 8 26 15 58 15s58-7 58-15v-7" fill="none" stroke="#E6D2A8" strokeWidth="1.5" />

      {/* sparkles */}
      <g stroke="#D5A536" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M52 84v14M45 91h14" />
        <path d="M188 66v11M182.5 71.5h11" />
        <path d="M196 118v10M191 123h10" />
        <path d="M44 138v9M39.5 142.5h9" />
      </g>
      <circle cx="70" cy="60" r="2.4" fill="#E1B650" />
      <circle cx="172" cy="150" r="2.2" fill="#E1B650" />

      {/* cart wheels */}
      <circle cx="103" cy="158" r="8.5" fill="url(#cart-gold)" />
      <circle cx="148" cy="158" r="8.5" fill="url(#cart-gold)" />
      <circle cx="103" cy="158" r="3" fill="#FFFDF9" opacity="0.7" />
      <circle cx="148" cy="158" r="3" fill="#FFFDF9" opacity="0.7" />

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
