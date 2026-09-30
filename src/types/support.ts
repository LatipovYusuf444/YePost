export type QollabQuvvatlashHolati = "SENT" | "DELIVERED" | "READ";

export type QollabQuvvatlashXabari = {
  id: string;
  text: string;
  // OUT = biznes (tenant) -> YePost qo'llab-quvvatlash, IN = qo'llab-quvvatlash -> biznes.
  direction: "OUT" | "IN";
  senderName?: string;
  senderAvatarUrl?: string;
  status?: QollabQuvvatlashHolati;
  createdAt: string;
  attachments?: Array<{ id: string; url: string; name: string }>;
};

export type QollabQuvvatlashJavobi =
  | QollabQuvvatlashXabari[]
  | {
      items?: QollabQuvvatlashXabari[];
      results?: QollabQuvvatlashXabari[];
      data?: QollabQuvvatlashXabari[];
      value?: QollabQuvvatlashXabari[];
      nextCursor?: string | null;
      cursor?: string | null;
    };

// Murojaatlar (ticket) — backendga hali qo'shilmagan; qarang: docs/support-backend-spec.md
export type SupportTicketHolati = "ACTIVE" | "IN_PROGRESS" | "COMPLETED";

export type SupportTicket = {
  id: string;
  subject: string;
  status: SupportTicketHolati;
  createdAt: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  messageCount?: number;
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
};
