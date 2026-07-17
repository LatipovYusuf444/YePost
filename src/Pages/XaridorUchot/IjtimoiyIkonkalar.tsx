// lucide-react brend ikonkalarini bermaydi — Telegram/WhatsApp/Instagram uchun inline SVG.

type Props = { size?: number };

export function TelegramIkonka({ size = 16 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.6l-3.02 14.25c-.23 1.01-.83 1.26-1.68.78l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19l-10.63 6.7-4.58-1.43c-1-.31-1.02-1 .21-1.48l17.9-6.9c.83-.3 1.56.2 1.27 1.57z" />
    </svg>
  );
}

export function WhatsappIkonka({ size = 16 }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.63.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.2-.24-.57-.48-.5-.66-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2.05 22l5.35-1.4a9.82 9.82 0 004.64 1.18h.01c5.43 0 9.85-4.42 9.85-9.86 0-2.63-1.03-5.11-2.89-6.97A9.78 9.78 0 0012.04 2zm0 1.8c2.15 0 4.17.84 5.69 2.36a8 8 0 012.36 5.7c0 4.46-3.63 8.06-8.06 8.06a8.1 8.1 0 01-4.12-1.13l-.3-.18-3.06.8.82-2.98-.19-.31a8 8 0 01-1.23-4.26c0-4.46 3.63-8.06 8.09-8.06z" />
    </svg>
  );
}

export function InstagramIkonka({ size = 16 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
