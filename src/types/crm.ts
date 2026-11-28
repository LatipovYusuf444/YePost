export type RoyxatJavobi<T> = T[] | { value?: T[]; items?: T[]; results?: T[]; data?: T[] };

export type CursorJavobi<T> =
  | T[]
  | {
      items?: T[];
      results?: T[];
      data?: T[];
      value?: T[];
      nextCursor?: string | null;
      cursor?: string | null;
    };

export type CrmUser = {
  id?: string;
  username?: string;
  fullName?: string;
  name?: string;
};

export type TimelineFilter = {
  types?: string;
  cursor?: string;
  limit?: number;
};

export type TimelineItem = {
  id?: string;
  type?: string;
  title?: string;
  text?: string;
  description?: string;
  createdAt?: string;
  timestamp?: string;
  actor?: CrmUser;
  user?: CrmUser;
  actorName?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Bildirishnoma = {
  id: string;
  title?: string;
  text?: string;
  message?: string;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
  [key: string]: unknown;
};

export type CustomFieldTuri =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SELECT"
  | "MULTISELECT";

export type CustomField = {
  id: string;
  entityType?: string;
  key: string;
  label: string;
  type: CustomFieldTuri | string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
};

export type CustomFieldSaqlash = {
  entityType?: string;
  key?: string;
  label?: string;
  type?: CustomFieldTuri;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
};

export type MijozDublikatFilter = {
  phone?: string;
  firstName?: string;
  lastName?: string;
};

export type MijozKartasi = {
  id?: string;
  customer?: unknown;
  sales?: unknown[];
  activities?: Activity[];
  comments?: Comment[];
  timeline?: TimelineItem[];
  [key: string]: unknown;
};

// MESSAGE va DEBT — CRM 1-bosqich; TASK "boshqa" sifatida qoladi.
export type ActivityTuri = "CALL" | "MEETING" | "MESSAGE" | "DEBT" | "TASK";
export type ActivityHolati = "PENDING" | "DONE" | "CANCELLED";

export type Activity = {
  id: string;
  type?: ActivityTuri | string;
  customerId?: string;
  subject?: string;
  description?: string;
  dueAt?: string;
  remindAt?: string;
  assigneeId?: string;
  assignee?: CrmUser;
  status?: ActivityHolati | string;
  result?: string;
  // Ochiq va muddati o'tgan (qizil ko'rsatish uchun).
  overdue?: boolean;
  partnerId?: string;
  partner?: { id: string; name?: string | null } | null;
  saleId?: string | null;
  sale?: { id: string; docNumber?: string | null } | null;
  cancelReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ActivityFilter = {
  customerId?: string;
  partnerId?: string;
  assigneeId?: string;
  status?: ActivityHolati;
  from?: string;
  to?: string;
};

export type ActivitySaqlash = {
  type: ActivityTuri;
  customerId?: string;
  partnerId?: string;
  subject: string;
  description?: string;
  dueAt: string;
  remindAt?: string;
  // Ixtiyoriy: berilmasa mijozning mas'uli, u bo'lmasa joriy xodim.
  assigneeId?: string;
  saleId?: string;
};

export type ActivityYangilash = Partial<ActivitySaqlash>;

export type Comment = {
  id: string;
  customerId?: string;
  partnerId?: string;
  text?: string;
  pinned?: boolean;
  isPinned?: boolean;
  author?: CrmUser;
  user?: CrmUser;
  createdAt?: string;
  updatedAt?: string;
  attachmentIds?: string[];
  attachments?: Attachment[];
};

export type CommentSaqlash = {
  text: string;
  mentionUserIds?: string[];
  attachmentIds?: string[];
};

export type Attachment = {
  id: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  createdAt?: string;
};

export type ChatMessage = {
  id?: string;
  customerId?: string;
  partnerId?: string;
  threadId?: string;
  text?: string;
  direction?: "IN" | "OUT" | string;
  createdAt?: string;
  sender?: CrmUser;
  // OUT: qaysi xodim yozdi; `null` — do'kon akkaunti egasi Telegram ilovasidan yozgan (Telegram Business).
  sentById?: string | null;
  // Kim yozgan: CUSTOMER | MANAGER | SHOP_ACCOUNT | AGENT | TEMPLATE; eski xabarlarda null bo'lishi mumkin (direction bo'yicha).
  author?: "CUSTOMER" | "MANAGER" | "SHOP_ACCOUNT" | "AGENT" | "TEMPLATE" | string | null;
  attachments?: Attachment[];
  [key: string]: unknown;
};

/** Suhbat kanali: bot bilan chat yoki do'konning o'z Telegram akkaunti (Telegram Business) bilan chat. */
export type ChatKanali = "TELEGRAM_BOT" | "TELEGRAM_BUSINESS";

export type ChatThread = {
  id: string;
  customerId?: string;
  // `null` — hali mijozga biriktirilmagan (yangi yozgan odam).
  partnerId?: string | null;
  customer?: unknown;
  lastMessage?: ChatMessage;
  unreadCount?: number;
  assignedTo?: CrmUser;
  assignedToId?: string | null;
  channel?: ChatKanali | string;
  // TELEGRAM_BUSINESS: do'kon akkaunti ulanishi id'si; bot chatida "".
  businessConnectionId?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  displayName?: string;
  lastMessageAt?: string | null;
  // Savdo agenti (faqat TELEGRAM_BUSINESS): kim javob beradi va menejer yozgani uchun agent shu vaqtgacha jim.
  mode?: "AGENT" | "MANAGER" | "NEEDS_MANAGER" | "PAUSED" | string;
  managerActiveUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Agent shu suhbatda nima qilgani (GET /crm/chat/threads/:id/agent-calls). */
export type AgentAmali = {
  id: string;
  tool: string;
  input?: unknown;
  result?: unknown;
  error?: string | null;
  durationMs?: number | null;
  createdAt?: string;
};

/** Lid bosqichi (voronka): SALE va LOST lidni yopadi. */
export type LidBosqichi = "NEW" | "INTERESTED" | "ORDER" | "SALE" | "CALL_BACK" | "LOST";
export const LID_BOSQICHLARI: LidBosqichi[] = ["NEW", "INTERESTED", "ORDER", "CALL_BACK", "SALE", "LOST"];
/** Yo'qotish sabablari (stage LOST bo'lganda majburiy). */
export type LidYoqotishSababi = "TOO_EXPENSIVE" | "OUT_OF_STOCK" | "NO_REPLY" | "BOUGHT_ELSEWHERE" | "PRICE_ONLY" | "OTHER";
export const LID_YOQOTISH_SABABLARI: LidYoqotishSababi[] = ["TOO_EXPENSIVE", "OUT_OF_STOCK", "NO_REPLY", "BOUGHT_ELSEWHERE", "PRICE_ONLY", "OTHER"];

export type Lid = {
  id: string;
  threadId: string;
  source: ChatKanali | string;
  stage: LidBosqichi | string;
  lostReason?: LidYoqotishSababi | string | null;
  ownerId?: string | null;
  // Lidning birinchi xabaridan do'konning birinchi javobigacha (soniya).
  firstReplySeconds?: number | null;
  lastActivityAt?: string;
  stageEnteredAt?: string;
  closedAt?: string | null;
  createdAt?: string;
  thread?: { id: string; channel?: string; displayName?: string; telegramUsername?: string; partnerId?: string | null } | null;
  owner?: { id: string; fullName?: string | null } | null;
};

export type LidIzohi = { id: string; author: "AGENT" | "MANAGER" | string; userId?: string | null; text: string; createdAt: string };
export type LidHodisasi = { id: string; fromStage?: string | null; toStage: string; actor: "SYSTEM" | "MANAGER" | "CRON" | string; userId?: string | null; createdAt: string };
export type LidKartochkasi = Lid & { notes?: LidIzohi[]; events?: LidHodisasi[] };

export type LidVoronkasi = { total: number; interested: number; ordered: number; sold: number; lost: number };
export type LidStatistikasi = { total: LidVoronkasi; bySource: Array<LidVoronkasi & { source: string }> };

// ---- CRM 1-bosqich: faoliyat natijasi (POST /crm/contacts), keyingi qadam, "Bugungi ishlar" ----
export type ContactTuri = "CALL" | "MEETING" | "MESSAGE";
export type ContactNatijasi = "ORDER" | "LATER" | "THINKING" | "NO_ANSWER" | "REJECTED";
export type RadSababi = "PRICE" | "COMPETITOR" | "NOT_NEEDED" | "OTHER";

/** Keyingi vazifa: LATER/THINKING da majburiy, NO_ANSWER/ORDER/REJECTED da ixtiyoriy. */
export type KeyingiVazifa = {
  type: ActivityTuri;
  subject: string;
  dueAt: string;
  remindAt?: string;
  assigneeId?: string;
  description?: string;
  saleId?: string;
};

export type ContactMalumoti = {
  type: ContactTuri;
  result: ContactNatijasi;
  text?: string;
  rejectReason?: RadSababi;
  saleId?: string;
};

export type ContactYaratish = ContactMalumoti & { partnerId: string; nextTask?: KeyingiVazifa };

export type Contact = {
  id: string;
  partnerId?: string;
  type?: ContactTuri | string;
  result?: ContactNatijasi | string;
  rejectReason?: RadSababi | string | null;
  text?: string | null;
  saleId?: string | null;
  sale?: { id: string; docNumber?: string | null } | null;
  activityId?: string | null;
  author?: CrmUser | null;
  createdBy?: CrmUser | null;
  createdById?: string | null;
  createdAt?: string;
  [key: string]: unknown;
};

export type ContactJavobi = { contact: Contact; nextTask: Activity | null };
export type ContactRoyxati = { items: Contact[]; nextCursor: string | null };

/** POST /crm/activities/:id/complete — yangi tana (eski { result } ham ishlaydi). */
export type ActivityYakunlash = { contact: ContactMalumoti; nextTask?: KeyingiVazifa };
export type ActivityYakunlashJavobi = { activity: Activity; contact?: Contact | null; nextTask?: Activity | null };

export type KunTartibi = { overdue: Activity[]; today: Activity[]; tomorrow: Activity[]; later: Activity[] };
