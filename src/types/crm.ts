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

export type ActivityTuri = "CALL" | "MEETING" | "TASK";
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
  createdAt?: string;
  updatedAt?: string;
};

export type ActivityFilter = {
  customerId?: string;
  assigneeId?: string;
  status?: ActivityHolati;
  from?: string;
  to?: string;
};

export type ActivitySaqlash = {
  type: ActivityTuri;
  customerId: string;
  subject: string;
  description?: string;
  dueAt: string;
  remindAt?: string;
  assigneeId: string;
};

export type ActivityYangilash = Partial<ActivitySaqlash>;

export type Comment = {
  id: string;
  customerId?: string;
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
  text?: string;
  direction?: "IN" | "OUT" | string;
  createdAt?: string;
  sender?: CrmUser;
  [key: string]: unknown;
};

export type ChatThread = {
  id: string;
  customerId?: string;
  customer?: unknown;
  lastMessage?: ChatMessage;
  unreadCount?: number;
  assignedTo?: CrmUser;
  createdAt?: string;
  updatedAt?: string;
};
