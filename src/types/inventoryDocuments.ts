export type InventoryDocumentType = "PURCHASE" | "WRITE_OFF" | "STOCK_TAKE" | "TRANSFER";
export type InventoryHistoryAction = "CREATED" | "UPDATED" | "CONFIRMED" | "CANCELLED" | "SENT" | "RECEIVED" | "COMMENT_ADDED" | "COMMENT_UPDATED" | "COMMENT_DELETED" | "ATTACHMENT_UPLOADED" | "ATTACHMENT_DELETED";
export type DocumentUser = { id: string; fullName?: string; username?: string } | null;
export type DocumentComment = { id: string; text: string; author: DocumentUser; attachmentIds?: string[]; createdAt: string; updatedAt?: string; canEdit: boolean; canDelete: boolean };
export type DocumentAttachment = { id: string; commentId?: string | null; fileName: string; originalName?: string; mimeType: string; size: number; uploadedBy: DocumentUser; createdAt: string; canDelete: boolean };
export type HistoryChange = { field: string; oldValue: unknown; newValue: unknown };
export type DocumentHistory = { id: string; action: InventoryHistoryAction; actor: DocumentUser; changes?: HistoryChange[]; createdAt: string };
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };
